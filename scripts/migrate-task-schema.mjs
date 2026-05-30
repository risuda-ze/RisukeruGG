#!/usr/bin/env node

/**
 * Task スキーマ最新化スクリプト
 *
 * 目的:
 * - teams/{teamId}/kanbanColumns を teams/{teamId}/taskStatuses へ移行する
 * - tasks/{taskId}.columnId が現行 taskStatuses を指すように修復する
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の書き込みは --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/migrate-task-schema.mjs
 *   node scripts/migrate-task-schema.mjs --apply
 *   node scripts/migrate-task-schema.mjs --apply --prune-source
 *   node scripts/migrate-task-schema.mjs --team=<teamId>
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

function getArgValue(name, defaultValue = undefined) {
  const prefix = `--${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const APPLY = hasFlag('apply');
const APPLY_FALLBACK = hasFlag('apply-fallback');
const PRUNE_SOURCE = hasFlag('prune-source');
const TEAM_FILTER = getArgValue('team');
const MAX_BATCH_OPS = 400;

function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。' +
          ' サービスアカウント JSON を文字列で設定してください。'
      );
    }
    initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) });
  }

  return getFirestore();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    name: typeof data.name === 'string' ? data.name : '',
    order: typeof data.order === 'number' ? data.order : Number.MAX_SAFE_INTEGER,
    color: typeof data.color === 'string' ? data.color : '#9CA3AF',
    role: data.role === 'done' ? 'done' : null,
    createdAt: toDate(data.createdAt),
    raw: data,
    ref: doc.ref,
  };
}

function pickBestTarget(source, targets) {
  if (targets.length === 0) return null;

  const byId = targets.find((target) => target.id === source.id);
  if (byId) return byId;

  const byNameAndRole = targets.find(
    (target) => target.name === source.name && target.role === source.role
  );
  if (byNameAndRole) return byNameAndRole;

  const byName = targets.find((target) => target.name === source.name);
  if (byName) return byName;

  const byOrderAndRole = targets.find(
    (target) => target.order === source.order && target.role === source.role
  );
  if (byOrderAndRole) return byOrderAndRole;

  const byOrder = targets.find((target) => target.order === source.order);
  if (byOrder) return byOrder;

  return null;
}

function buildTargetStatuses(sourceStatuses, targetStatuses) {
  if (targetStatuses.length === 0) {
    return sourceStatuses.map((status) => ({ ...status, source: 'copied' }));
  }

  return targetStatuses.map((status) => ({ ...status, source: 'existing' }));
}

function buildColumnMapping(sourceStatuses, targetStatuses) {
  const mapping = new Map();

  for (const source of sourceStatuses) {
    const target = pickBestTarget(source, targetStatuses);
    if (target) {
      mapping.set(source.id, target.id);
    }
  }

  return mapping;
}

function buildTaskRepairPlan(tasks, targetStatuses, columnMapping) {
  const validTargetIds = new Set(targetStatuses.map((status) => status.id));
  const fallbackTarget =
    [...targetStatuses]
      .sort((left, right) => left.order - right.order)
      .find((status) => status.role !== 'done') ??
    [...targetStatuses].sort((left, right) => left.order - right.order)[0] ??
    null;

  const repairs = [];
  const warnings = [];

  for (const task of tasks) {
    const columnId = typeof task.columnId === 'string' ? task.columnId : null;
    if (!columnId) {
      warnings.push({ type: 'missing-column-id', taskId: task.id });
      continue;
    }

    if (validTargetIds.has(columnId)) {
      continue;
    }

    const mappedColumnId = columnMapping.get(columnId);
    if (mappedColumnId && validTargetIds.has(mappedColumnId)) {
      repairs.push({ taskId: task.id, from: columnId, to: mappedColumnId, reason: 'mapped' });
      continue;
    }

    if (APPLY_FALLBACK && fallbackTarget) {
      repairs.push({
        taskId: task.id,
        from: columnId,
        to: fallbackTarget.id,
        reason: 'fallback',
      });
      warnings.push({
        type: 'fallback-column-id',
        taskId: task.id,
        from: columnId,
        to: fallbackTarget.id,
      });
      continue;
    }

    warnings.push({
      type: fallbackTarget ? 'fallback-required' : 'unresolved-column-id',
      taskId: task.id,
      from: columnId,
      to: fallbackTarget?.id ?? null,
    });
  }

  return { repairs, warnings };
}

async function loadTeams(db) {
  const teamsRef = db.collection('teams');
  if (TEAM_FILTER) {
    const teamDoc = await teamsRef.doc(TEAM_FILTER).get();
    return teamDoc.exists ? [{ id: teamDoc.id, ref: teamDoc.ref }] : [];
  }

  const teamsSnap = await teamsRef.get();
  return teamsSnap.docs.map((doc) => ({ id: doc.id, ref: doc.ref }));
}

async function inspectTeam(team) {
  const [sourceSnap, targetSnap, tasksSnap] = await Promise.all([
    team.ref.collection('kanbanColumns').get(),
    team.ref.collection('taskStatuses').get(),
    team.ref.collection('tasks').get(),
  ]);

  const sourceStatuses = sourceSnap.docs.map(normalizeStatus).sort((a, b) => a.order - b.order);
  const existingTargetStatuses = targetSnap.docs
    .map(normalizeStatus)
    .sort((a, b) => a.order - b.order);
  const targetStatuses = buildTargetStatuses(sourceStatuses, existingTargetStatuses);
  const columnMapping = buildColumnMapping(sourceStatuses, targetStatuses);

  const tasks = tasksSnap.docs.map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }));
  const taskPlan = buildTaskRepairPlan(tasks, targetStatuses, columnMapping);

  const copyStatuses = [];
  if (existingTargetStatuses.length === 0) {
    for (const status of sourceStatuses) {
      copyStatuses.push({ id: status.id, payload: status.raw });
    }
  }

  return {
    teamId: team.id,
    sourceStatuses,
    existingTargetStatuses,
    targetStatuses,
    columnMapping,
    copyStatuses,
    taskRepairs: taskPlan.repairs,
    warnings: taskPlan.warnings,
  };
}

async function applyTeamPlan(db, plan) {
  const operations = [];

  for (const status of plan.copyStatuses) {
    operations.push({
      type: 'set',
      ref: db.doc(`teams/${plan.teamId}/taskStatuses/${status.id}`),
      data: status.payload,
      options: { merge: true },
    });
  }

  for (const repair of plan.taskRepairs) {
    operations.push({
      type: 'update',
      ref: db.doc(`teams/${plan.teamId}/tasks/${repair.taskId}`),
      data: { columnId: repair.to },
    });
  }

  if (PRUNE_SOURCE) {
    for (const status of plan.sourceStatuses) {
      operations.push({
        type: 'delete',
        ref: db.doc(`teams/${plan.teamId}/kanbanColumns/${status.id}`),
      });
    }
  }

  for (let index = 0; index < operations.length; index += MAX_BATCH_OPS) {
    const batch = db.batch();
    const chunk = operations.slice(index, index + MAX_BATCH_OPS);

    for (const operation of chunk) {
      if (operation.type === 'set') {
        batch.set(operation.ref, operation.data, operation.options);
      } else if (operation.type === 'update') {
        batch.update(operation.ref, operation.data);
      } else {
        batch.delete(operation.ref);
      }
    }

    await batch.commit();
  }
}

function printTeamPlan(plan) {
  console.log(`\n- ${plan.teamId}`);
  console.log(`  source statuses : ${plan.sourceStatuses.length}`);
  console.log(`  target statuses : ${plan.existingTargetStatuses.length}`);
  console.log(`  status copies   : ${plan.copyStatuses.length}`);
  console.log(`  task repairs    : ${plan.taskRepairs.length}`);
  console.log(`  warnings        : ${plan.warnings.length}`);

  for (const repair of plan.taskRepairs.slice(0, 20)) {
    console.log(`  repair ${repair.taskId}: ${repair.from} -> ${repair.to} (${repair.reason})`);
  }

  if (plan.taskRepairs.length > 20) {
    console.log(`  ... and ${plan.taskRepairs.length - 20} more repairs`);
  }

  for (const warning of plan.warnings.slice(0, 20)) {
    if (warning.type === 'fallback-column-id') {
      console.log(`  warning ${warning.taskId}: ${warning.from} -> ${warning.to} (fallback)`);
    } else if (warning.type === 'fallback-required') {
      console.log(
        `  warning ${warning.taskId}: ${warning.from} needs fallback target ${warning.to}`
      );
    } else if (warning.type === 'unresolved-column-id') {
      console.log(`  warning ${warning.taskId}: unresolved columnId ${warning.from}`);
    } else if (warning.type === 'missing-column-id') {
      console.log(`  warning ${warning.taskId}: missing columnId`);
    }
  }
}

async function main() {
  const db = getAdminDb();
  const teams = await loadTeams(db);
  const plans = [];

  for (const team of teams) {
    const plan = await inspectTeam(team);
    if (
      plan.sourceStatuses.length === 0 &&
      plan.copyStatuses.length === 0 &&
      plan.taskRepairs.length === 0 &&
      plan.warnings.length === 0
    ) {
      continue;
    }
    plans.push(plan);
  }

  console.log('\n=== Task スキーマ最新化 ===');
  console.log(`mode          : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`apply fallback: ${APPLY_FALLBACK ? 'YES' : 'NO'}`);
  console.log(`team filter   : ${TEAM_FILTER ?? '(none)'}`);
  console.log(`prune source  : ${APPLY && PRUNE_SOURCE ? 'YES' : 'NO'}`);
  console.log(`teams planned : ${plans.length}`);

  let totalCopies = 0;
  let totalRepairs = 0;
  let totalWarnings = 0;

  for (const plan of plans) {
    totalCopies += plan.copyStatuses.length;
    totalRepairs += plan.taskRepairs.length;
    totalWarnings += plan.warnings.length;
    printTeamPlan(plan);
  }

  console.log('\n=== Summary ===');
  console.log(`status copies : ${totalCopies}`);
  console.log(`task repairs  : ${totalRepairs}`);
  console.log(`warnings      : ${totalWarnings}`);

  if (!APPLY) {
    console.log('\n変更は適用していません。適用する場合は --apply を付けて再実行してください。');
    return;
  }

  for (const plan of plans) {
    await applyTeamPlan(db, plan);
  }

  console.log('\n移行を適用しました。');
}

main().catch((error) => {
  console.error('\nTask schema migration failed:');
  console.error(error);
  process.exitCode = 1;
});
