#!/usr/bin/env node

/**
 * メンバー予定ミラーの廃止に伴う既存データの削除スクリプト（一回性）
 *
 * 背景:
 * - Google カレンダー連携を「メンバー予定のミラー」から「チーム予定の書き出し」へ転換した
 *   （docs/変更仕様/google-calendar-export.md）。
 * - アプリはもう次のデータを読み書きしないため、残っているものを削除する。
 *     teams/{teamId}/memberCalendars/{userId}/events/{eventId}
 *     users/{uid}.googleCalendar
 *
 * 本番適用が完了したら、このスクリプトはリポジトリから削除する（scripts/migration-runbook.md の方針）。
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の削除は --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/delete-member-calendars.mjs
 *   node scripts/delete-member-calendars.mjs --apply
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.slice(2).includes('--apply');
/** Firestore のバッチ書き込み上限（500）未満に抑える */
const BATCH_SIZE = 400;

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

/** チームごとに memberCalendars 配下を数え、--apply なら再帰削除する */
async function deleteMemberCalendars(db) {
  // listDocuments は、サブコレクションだけを持つ実体のないドキュメントも返す
  const teamRefs = await db.collection('teams').listDocuments();
  let teams = 0;
  let events = 0;

  for (const teamRef of teamRefs) {
    const memberRefs = await teamRef.collection('memberCalendars').listDocuments();
    if (memberRefs.length === 0) continue;

    let teamEvents = 0;
    for (const memberRef of memberRefs) {
      const count = await memberRef.collection('events').count().get();
      teamEvents += count.data().count;
    }
    teams += 1;
    events += teamEvents;
    console.log(`  teams/${teamRef.id}: メンバー ${memberRefs.length} 人 / 予定 ${teamEvents} 件`);

    if (APPLY) await db.recursiveDelete(teamRef.collection('memberCalendars'));
  }

  return { teams, events };
}

/** users/{uid}.googleCalendar を持つドキュメントからフィールドを消す */
async function deleteGoogleCalendarField(db) {
  // orderBy は、そのフィールドを持つドキュメント（値が null のものを含む）だけを返す
  const snap = await db.collection('users').orderBy('googleCalendar').get();

  if (APPLY) {
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      for (const doc of snap.docs.slice(i, i + BATCH_SIZE)) {
        batch.update(doc.ref, { googleCalendar: FieldValue.delete() });
      }
      await batch.commit();
    }
  }

  return snap.size;
}

async function main() {
  const db = getAdminDb();
  console.log(`=== メンバー予定ミラーの削除（${APPLY ? '本適用' : 'dry-run'}） ===\n`);

  console.log('memberCalendars:');
  const { teams, events } = await deleteMemberCalendars(db);
  console.log(`  対象: ${teams} チーム / 予定 ${events} 件\n`);

  const users = await deleteGoogleCalendarField(db);
  console.log(`users.googleCalendar:\n  対象: ${users} 件\n`);

  console.log(
    APPLY
      ? '削除しました。もう一度 dry-run を実行し、対象が 0 件になったことを確認してください。'
      : 'dry-run のため何も削除していません。削除するには --apply を付けて実行してください。'
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
