#!/usr/bin/env node

/**
 * ロールの保存値を `staff` に寄せる一回性の移行スクリプト（本番作業①）
 *
 * 背景:
 * - ロールを「メンバー / スタッフ」の 2 種類にする（docs/変更仕様/two-roles.md）。
 * - 新しい `member` は管理者を指し、旧 `member`（編集者）と意味が逆になる。
 *   意味を切り替える PR B をデプロイする前に、旧 `member` / `rom` / `editor` / `viewer` を
 *   すべて `staff` へ書き換えておく。旧 `member` が 1 件でも残ると、その人が管理者になる。
 *
 * 書き換え:
 *   teams/{teamId}/members/{uid}.role
 *     member / rom / editor / viewer -> staff
 *     operator / owner / staff       -> 変更しない
 *     上記以外（未知の値）           -> 書き換えず一覧表示する
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 *   （Emulator に向ける場合は FIRESTORE_EMULATOR_HOST を設定する。キーは不要）
 * - 既定は dry-run。実際の書き換えは --apply を指定した場合のみ行う
 * - PR B のデプロイ後に実行してはならない（新 member を staff に落としてしまう）
 *
 * 使い方:
 *   node scripts/migrate-roles-to-staff.mjs            # 件数の確認（dry-run）
 *   node scripts/migrate-roles-to-staff.mjs --apply    # 書き換え
 *   node scripts/migrate-roles-to-staff.mjs            # 再実行し、旧 member が 0 件であることを確認
 *
 * 本番適用が完了したら、このスクリプトはリポジトリから削除する（scripts/migration-runbook.md の方針）。
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.slice(2).includes('--apply');
/** Firestore のバッチ書き込み上限（500）未満に抑える */
const BATCH_SIZE = 400;
/** staff へ書き換える旧値 */
const LEGACY_TO_STAFF = new Set(['member', 'rom', 'editor', 'viewer']);
/** そのまま残す値 */
const KEEP = new Set(['operator', 'owner', 'staff']);

function getAdminDb() {
  if (getApps().length === 0) {
    if (process.env.FIRESTORE_EMULATOR_HOST) {
      initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-risukeru' });
    } else {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error(
          'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。' +
            ' サービスアカウント JSON を文字列で設定してください。'
        );
      }
      initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) });
    }
  }
  return getFirestore();
}

const db = getAdminDb();
console.log(APPLY ? '【適用モード】書き換えます' : '【dry-run】書き込みません（--apply で適用）');

// members は teams/{teamId}/members のみ。念のためパスで絞る
const snap = await db.collectionGroup('members').get();
const docs = snap.docs.filter((d) => /^teams\/[^/]+\/members\/[^/]+$/.test(d.ref.path));

const counts = new Map();
const targets = [];
const unknown = [];
for (const doc of docs) {
  const role = doc.get('role');
  counts.set(String(role), (counts.get(String(role)) ?? 0) + 1);
  if (LEGACY_TO_STAFF.has(role)) targets.push(doc);
  else if (!KEEP.has(role)) unknown.push(doc);
}

console.log(`所属者 ${docs.length} 件（role ごとの件数）`);
for (const [role, n] of [...counts].sort()) console.log(`  ${role}: ${n}`);

if (unknown.length > 0) {
  console.log(`\n未知の role（書き換えません）: ${unknown.length} 件`);
  for (const d of unknown) console.log(`  ${d.ref.path}: ${JSON.stringify(d.get('role'))}`);
}

console.log(`\nstaff へ書き換える対象: ${targets.length} 件`);

if (APPLY) {
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const doc of targets.slice(i, i + BATCH_SIZE)) batch.update(doc.ref, { role: 'staff' });
    await batch.commit();
  }
  console.log(`${targets.length} 件を staff に書き換えました。dry-run を再実行し、旧 member が 0 件であることを確認してください`);
} else if (targets.length === 0 && unknown.length === 0) {
  console.log('旧 member / rom / editor / viewer は 0 件です（PR B をデプロイできる状態）');
}

// 未知の値が残る場合は PR B に進まない（staff 扱いで管理者にはならないが、内容を確認する）
process.exitCode = unknown.length > 0 ? 2 : 0;
