#!/usr/bin/env node

/**
 * 終日予定エンコーディング移行スクリプト
 *
 * 背景:
 * - 旧仕様: 終日予定は endAt を「最終日 00:00（包含的）」または
 *   単日の場合 startAt と同時刻で保存していた
 * - 新仕様（Google カレンダー準拠）: endAt は「最終日翌日 00:00（排他的）」
 * - 対象は teams/{teamId}/schedules の allDay:true レコードのみ。
 *   Discord bot / AI 提案経由の作成は allDay:false 固定のため対象外。
 *   memberCalendars/*/events は Google の生値をそのまま保存しており
 *   元々排他的終了のため対象外（allDay フラグの誤りはログイン時の
 *   再同期で自然に修復される）。
 *
 * 実施タイミング:
 * - 本スクリプトは「終日予定を排他的終了で解釈する」アプリ側の修正を
 *   デプロイする **前** に一度だけ実行すること。
 * - 修正デプロイ後に新仕様（排他的終了）で保存されたレコードに対して
 *   本スクリプトを再実行すると、endAt がさらに1日ずれてしまうため
 *   絶対に再実行しないこと。
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の書き込みは --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/migrate-allday-schedule-encoding.mjs
 *   node scripts/migrate-allday-schedule-encoding.mjs --apply
 *   node scripts/migrate-allday-schedule-encoding.mjs --apply --team=<teamId>
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { startOfDay, addDays } from 'date-fns';

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

async function loadTeams(db) {
  const teamsRef = db.collection('teams');
  if (TEAM_FILTER) {
    const teamDoc = await teamsRef.doc(TEAM_FILTER).get();
    return teamDoc.exists ? [{ id: teamDoc.id, ref: teamDoc.ref }] : [];
  }

  const teamsSnap = await teamsRef.get();
  return teamsSnap.docs.map((doc) => ({ id: doc.id, ref: doc.ref }));
}

/** 新 endAt（最終日翌日 00:00 の排他的終了）を計算する */
function computeNewEndAt(startAt, endAt) {
  // 旧仕様は最終日 00:00 (複数日) または startAt と同時刻 (単日) のいずれか。
  // どちらも「+1日」で新仕様（排他的終了）に変換できる。
  return addDays(startOfDay(endAt), 1);
}

async function inspectTeam(team) {
  const schedulesSnap = await team.ref.collection('schedules').where('allDay', '==', true).get();

  const repairs = [];
  const warnings = [];

  for (const doc of schedulesSnap.docs) {
    const data = doc.data();
    const startAt = data.startAt?.toDate?.();
    const endAt = data.endAt?.toDate?.();

    if (!startAt || !endAt) {
      warnings.push({ scheduleId: doc.id, reason: 'missing-startAt-or-endAt' });
      continue;
    }

    const newEndAt = computeNewEndAt(startAt, endAt);

    if (newEndAt.getTime() <= startAt.getTime()) {
      warnings.push({ scheduleId: doc.id, reason: 'unexpected-date-order', startAt, endAt });
      continue;
    }

    repairs.push({ scheduleId: doc.id, ref: doc.ref, startAt, oldEndAt: endAt, newEndAt });
  }

  return { teamId: team.id, repairs, warnings };
}

async function applyTeamPlan(db, plan) {
  for (let index = 0; index < plan.repairs.length; index += MAX_BATCH_OPS) {
    const batch = db.batch();
    const chunk = plan.repairs.slice(index, index + MAX_BATCH_OPS);

    for (const repair of chunk) {
      batch.update(repair.ref, { endAt: Timestamp.fromDate(repair.newEndAt) });
    }

    await batch.commit();
  }
}

function printTeamPlan(plan) {
  console.log(`\n- ${plan.teamId}`);
  console.log(`  repairs  : ${plan.repairs.length}`);
  console.log(`  warnings : ${plan.warnings.length}`);

  for (const repair of plan.repairs.slice(0, 10)) {
    console.log(
      `  ${repair.scheduleId}: endAt ${repair.oldEndAt.toISOString()} -> ${repair.newEndAt.toISOString()}`
    );
  }
  if (plan.repairs.length > 10) {
    console.log(`  ... and ${plan.repairs.length - 10} more`);
  }

  for (const warning of plan.warnings) {
    console.log(`  warning ${warning.scheduleId}: ${warning.reason}`);
  }
}

async function main() {
  const db = getAdminDb();
  const teams = await loadTeams(db);
  const plans = [];

  for (const team of teams) {
    const plan = await inspectTeam(team);
    if (plan.repairs.length === 0 && plan.warnings.length === 0) continue;
    plans.push(plan);
  }

  console.log('\n=== 終日予定エンコーディング移行 ===');
  console.log(`mode        : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`team filter : ${TEAM_FILTER ?? '(none)'}`);
  console.log(`teams planned: ${plans.length}`);

  let totalRepairs = 0;
  let totalWarnings = 0;
  for (const plan of plans) {
    totalRepairs += plan.repairs.length;
    totalWarnings += plan.warnings.length;
    printTeamPlan(plan);
  }

  console.log('\n=== Summary ===');
  console.log(`schedule repairs: ${totalRepairs}`);
  console.log(`warnings        : ${totalWarnings}`);

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
  console.error('\nAll-day schedule encoding migration failed:');
  console.error(error);
  process.exitCode = 1;
});
