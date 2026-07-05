#!/usr/bin/env node

/**
 * カテゴリ統合スキーマ移行スクリプト
 *
 * 目的:
 * - 旧 teams/{teamId}/taskCategories と teams/{teamId}/scheduleCategories を
 *   新設の teams/{teamId}/categories へコピーする（ID を維持し、
 *   tasks/{id}.categoryId・schedules/{id}.categoryId の既存参照を解決可能にする）
 *
 * 対象スキーマ変更（2026-07-05, commit 6c96d0b）:
 * - teams/{id}/taskCategories/{catId}     → teams/{id}/categories/{catId}
 * - teams/{id}/scheduleCategories/{catId} → teams/{id}/categories/{catId}
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の書き込みは --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/migrate-category-schema.mjs
 *   node scripts/migrate-category-schema.mjs --apply
 *   node scripts/migrate-category-schema.mjs --apply --prune-source
 *   node scripts/migrate-category-schema.mjs --team=<teamId>
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
const PRUNE_SOURCE = hasFlag('prune-source');
const TEAM_FILTER = getArgValue('team');
const MAX_BATCH_OPS = 400;

function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。\n' +
          'PowerShell: $env:FIREBASE_SERVICE_ACCOUNT_KEY = Get-Content .\\service-account.json -Raw'
      );
    }
    initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) });
  }
  return getFirestore();
}

async function loadTeams(db) {
  const teamsRef = db.collection('teams');
  if (TEAM_FILTER) {
    const snap = await teamsRef.doc(TEAM_FILTER).get();
    return snap.exists ? [{ id: snap.id, ref: snap.ref }] : [];
  }
  const snap = await teamsRef.get();
  return snap.docs.map((doc) => ({ id: doc.id, ref: doc.ref }));
}

function normalizeCategoryPayload(data) {
  const payload = {
    name: typeof data.name === 'string' ? data.name : '',
    color: typeof data.color === 'string' ? data.color : '#7F77DD',
    order: typeof data.order === 'number' ? data.order : 0,
    icon: typeof data.icon === 'string' ? data.icon : null,
  };
  if (data.createdAt) {
    payload.createdAt = data.createdAt;
  }
  return payload;
}

async function inspectTeam(team) {
  const [taskCatSnap, scheduleCatSnap, existingCatSnap] = await Promise.all([
    team.ref.collection('taskCategories').get(),
    team.ref.collection('scheduleCategories').get(),
    team.ref.collection('categories').get(),
  ]);

  const existingIds = new Set(existingCatSnap.docs.map((doc) => doc.id));
  const copies = [];
  const conflicts = [];

  for (const doc of [...taskCatSnap.docs, ...scheduleCatSnap.docs]) {
    if (existingIds.has(doc.id)) {
      conflicts.push({ id: doc.id, source: doc.ref.parent.id });
      continue;
    }
    copies.push({
      id: doc.id,
      source: doc.ref.parent.id,
      payload: normalizeCategoryPayload(doc.data()),
    });
    existingIds.add(doc.id);
  }

  return {
    teamId: team.id,
    taskCategoryCount: taskCatSnap.docs.length,
    scheduleCategoryCount: scheduleCatSnap.docs.length,
    existingCategoryCount: existingCatSnap.docs.length,
    copies,
    conflicts,
    sourceRefs: [...taskCatSnap.docs.map((d) => d.ref), ...scheduleCatSnap.docs.map((d) => d.ref)],
  };
}

async function applyTeamPlan(db, plan) {
  const operations = [];

  for (const copy of plan.copies) {
    operations.push({
      type: 'set',
      ref: db.doc(`teams/${plan.teamId}/categories/${copy.id}`),
      data: copy.payload,
    });
  }

  if (PRUNE_SOURCE) {
    for (const ref of plan.sourceRefs) {
      operations.push({ type: 'delete', ref });
    }
  }

  for (let index = 0; index < operations.length; index += MAX_BATCH_OPS) {
    const batch = db.batch();
    const chunk = operations.slice(index, index + MAX_BATCH_OPS);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data, { merge: true });
      } else {
        batch.delete(op.ref);
      }
    }
    await batch.commit();
  }
}

function printTeamPlan(plan) {
  console.log(`\n- ${plan.teamId}`);
  console.log(`  taskCategories     : ${plan.taskCategoryCount}`);
  console.log(`  scheduleCategories : ${plan.scheduleCategoryCount}`);
  console.log(`  existing categories: ${plan.existingCategoryCount}`);
  console.log(`  copies planned     : ${plan.copies.length}`);
  console.log(`  skipped (既存ID)   : ${plan.conflicts.length}`);

  for (const copy of plan.copies.slice(0, 20)) {
    console.log(`  copy ${copy.source}/${copy.id} -> categories/${copy.id} ("${copy.payload.name}")`);
  }
  if (plan.copies.length > 20) {
    console.log(`  ... and ${plan.copies.length - 20} more copies`);
  }

  for (const conflict of plan.conflicts) {
    console.log(
      `  skip: ${conflict.source}/${conflict.id} は categories/${conflict.id} に既に存在するためスキップ（移行済み、または既存カテゴリと同一IDの場合は要確認）`
    );
  }
}

async function main() {
  const db = getAdminDb();
  const teams = await loadTeams(db);
  const plans = [];

  for (const team of teams) {
    const plan = await inspectTeam(team);
    if (
      plan.taskCategoryCount === 0 &&
      plan.scheduleCategoryCount === 0 &&
      plan.conflicts.length === 0
    ) {
      continue;
    }
    plans.push(plan);
  }

  console.log('\n=== カテゴリ統合スキーマ移行 ===');
  console.log(`mode          : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`team filter   : ${TEAM_FILTER ?? '(none)'}`);
  console.log(`prune source  : ${APPLY && PRUNE_SOURCE ? 'YES' : 'NO'}`);
  console.log(`teams planned : ${plans.length}`);

  let totalCopies = 0;
  let totalConflicts = 0;

  for (const plan of plans) {
    totalCopies += plan.copies.length;
    totalConflicts += plan.conflicts.length;
    printTeamPlan(plan);
  }

  console.log('\n=== Summary ===');
  console.log(`category copies : ${totalCopies}`);
  console.log(`skipped         : ${totalConflicts}`);

  if (!APPLY) {
    console.log('\n変更は適用していません。適用する場合は --apply を付けて再実行してください。');
    return;
  }

  if (totalCopies === 0 && !(PRUNE_SOURCE && plans.some((p) => p.sourceRefs.length > 0))) {
    console.log('\n適用対象がありません。移行済みです。');
    return;
  }

  for (const plan of plans) {
    await applyTeamPlan(db, plan);
  }

  console.log('\n移行を適用しました。');
}

main().catch((error) => {
  console.error('\nCategory schema migration failed:');
  console.error(error);
  process.exitCode = 1;
});
