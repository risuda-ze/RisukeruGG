#!/usr/bin/env node

/**
 * 管理者の保存値を `member` に揃え、旧フィールドを削除する一回性の移行スクリプト（本番作業②）
 *
 * 背景:
 * - ロールを「メンバー / スタッフ」の 2 種類にする（docs/変更仕様/two-roles.md）。
 * - PR B の反映後、管理者は `member` で保存されるが、既存の管理者は旧 `operator` / `owner` のまま残っている
 *   （ルール・Functions・クライアントが互換として管理者扱いしている）。
 * - 互換を外す PR C をデプロイする前に、旧値を `member` へ書き換えておく。
 *   旧 `operator` / `owner` が 1 件でも残ると、PR C の反映後にその人が管理者でなくなる。
 *
 * 書き換え:
 *   teams/{teamId}/members/{uid}.role
 *     operator / owner     -> member
 *     member / staff       -> 変更しない
 *     上記以外（未知の値） -> 書き換えず一覧表示する
 *   teams/{teamId}
 *     operatorUids / ownerId -> フィールドを削除する（どこからも参照していない）
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 *   （Emulator に向ける場合は FIRESTORE_EMULATOR_HOST を設定する。キーは不要）
 * - 既定は dry-run。実際の書き換えは --apply を指定した場合のみ行う
 * - PR B の本番反映前に実行してはならない（PR B より前は `member` が編集者を指すため、管理者が権限を失う）
 * - 誰も利用していない時間に実行する。読み取った時点の role をもとに書き換えるため、
 *   読み取りから書き込みまでの間に降格された人を `member` で上書きして管理者に戻してしまう
 *
 * 使い方:
 *   node scripts/migrate-operator-to-member.mjs            # 件数の確認（dry-run）
 *   node scripts/migrate-operator-to-member.mjs --apply    # 書き換え
 *   node scripts/migrate-operator-to-member.mjs            # 再実行し、対象が 0 件であることを確認
 *
 * 本番適用が完了したら、このスクリプトはリポジトリから削除する（scripts/migration-runbook.md の方針）。
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const APPLY = process.argv.slice(2).includes('--apply');
/** Firestore のバッチ書き込み上限（500）未満に抑える */
const BATCH_SIZE = 400;
/** member へ書き換える旧値 */
const LEGACY_TO_MEMBER = new Set(['operator', 'owner']);
/** そのまま残す値 */
const KEEP = new Set(['member', 'staff']);
/** teams/{teamId} から削除する旧フィールド */
const LEGACY_TEAM_FIELDS = ['operatorUids', 'ownerId'];

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

/** 更新をバッチ上限ごとに分けて書き込む */
async function commitInBatches(db, updates) {
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    for (const { ref, data } of updates.slice(i, i + BATCH_SIZE)) batch.update(ref, data);
    await batch.commit();
  }
}

const db = getAdminDb();
console.log(APPLY ? '【適用モード】書き換えます' : '【dry-run】書き込みません（--apply で適用）');

// members は teams/{teamId}/members のみ。念のためパスで絞る
const memberSnap = await db.collectionGroup('members').get();
const members = memberSnap.docs.filter((d) => /^teams\/[^/]+\/members\/[^/]+$/.test(d.ref.path));

const counts = new Map();
const roleUpdates = [];
const unknown = [];
for (const doc of members) {
  const role = doc.get('role');
  counts.set(String(role), (counts.get(String(role)) ?? 0) + 1);
  if (LEGACY_TO_MEMBER.has(role)) roleUpdates.push({ ref: doc.ref, data: { role: 'member' } });
  else if (!KEEP.has(role)) unknown.push(doc);
}

console.log(`所属者 ${members.length} 件（role ごとの件数）`);
for (const [role, n] of [...counts].sort()) console.log(`  ${role}: ${n}`);

if (unknown.length > 0) {
  console.log(`\n未知の role（書き換えません）: ${unknown.length} 件`);
  for (const d of unknown) console.log(`  ${d.ref.path}: ${JSON.stringify(d.get('role'))}`);
}

console.log(`\nmember へ書き換える対象: ${roleUpdates.length} 件`);

// teams/{teamId} の旧フィールド
const teamSnap = await db.collection('teams').get();
const teamUpdates = [];
for (const doc of teamSnap.docs) {
  const fields = LEGACY_TEAM_FIELDS.filter((f) => doc.get(f) !== undefined);
  if (fields.length === 0) continue;
  teamUpdates.push({ ref: doc.ref, data: Object.fromEntries(fields.map((f) => [f, FieldValue.delete()])) });
  console.log(`  ${doc.ref.path}: ${fields.join(' / ')} を削除`);
}
console.log(`チーム ${teamSnap.size} 件のうち、旧フィールドを削除する対象: ${teamUpdates.length} 件`);

if (APPLY) {
  await commitInBatches(db, roleUpdates);
  await commitInBatches(db, teamUpdates);
  console.log(
    `${roleUpdates.length} 件を member に書き換え、${teamUpdates.length} チームの旧フィールドを削除しました。` +
      'dry-run を再実行し、対象が 0 件であることを確認してください'
  );
} else if (roleUpdates.length === 0 && teamUpdates.length === 0 && unknown.length === 0) {
  console.log('旧 operator / owner と operatorUids / ownerId は 0 件です（PR C をデプロイできる状態）');
}

// 未知の値が残る場合は PR C に進まない（staff 扱いで管理者にはならないが、内容を確認する）
process.exitCode = unknown.length > 0 ? 2 : 0;
