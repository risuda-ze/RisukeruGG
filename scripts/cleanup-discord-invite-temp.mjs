#!/usr/bin/env node

/**
 * Discord Bot 招待フロー 一時データ クリーンアップスクリプト
 *
 * 背景:
 * - Bot招待フロー（bot-invite-start → Discord OAuth → bot-invite-callback）が
 *   認証エラーや Firestore インデックス不足などで途中失敗すると、
 *   discord_bot_invite_requests / discord_bot_invite_pending に
 *   使い捨てのはずの一時ドキュメントが削除されずに残る。
 * - これらは再利用されず機能への支障はないが、放置すると Firestore に
 *   ゴミとして蓄積し続けるため、期限切れ・古いものを削除する。
 *
 * これはスキーマ移行ではなく任意のメンテナンスです。実行しなくてもアプリは
 * 正常に動作します。
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の削除は --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/cleanup-discord-invite-temp.mjs
 *   node scripts/cleanup-discord-invite-temp.mjs --apply
 *   node scripts/cleanup-discord-invite-temp.mjs --apply --pending-max-age-minutes=30
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const argv = process.argv.slice(2);

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

function getArgValue(name, defaultValue) {
  const prefix = `--${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const APPLY = hasFlag('apply');
const PENDING_MAX_AGE_MINUTES = Number(getArgValue('pending-max-age-minutes', '60'));

function getAdminDb() {
  if (getApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY 環境変数が設定されていません。' +
          ' サービスアカウント JSON を文字列で設定してください。'
      );
    }
    const serviceAccount = JSON.parse(serviceAccountKey);
    initializeApp({ credential: cert(serviceAccount) });
  }

  return getFirestore();
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  return null;
}

/** expiresAt が無い、または既に期限切れの招待リクエストを孤児とみなす */
async function findStaleInviteRequests(db, now) {
  const snap = await db.collection('discord_bot_invite_requests').get();
  const stale = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const expiresAt = toDate(data.expiresAt);
    if (!expiresAt || expiresAt < now) {
      stale.push({
        ref: doc.ref,
        nonce: doc.id,
        teamId: typeof data.teamId === 'string' ? data.teamId : null,
        expiresAt,
      });
    }
  }

  return stale;
}

/** createdAt が無い、または一定時間より古いチャンネル選択待ちを孤児とみなす */
async function findStalePendingInvites(db, now) {
  const snap = await db.collection('discord_bot_invite_pending').get();
  const stale = [];
  const maxAgeMs = PENDING_MAX_AGE_MINUTES * 60 * 1000;

  for (const doc of snap.docs) {
    const data = doc.data();
    const createdAt = toDate(data.createdAt);
    if (!createdAt || now.getTime() - createdAt.getTime() > maxAgeMs) {
      stale.push({
        ref: doc.ref,
        nonce: doc.id,
        teamId: typeof data.teamId === 'string' ? data.teamId : null,
        guildId: typeof data.guildId === 'string' ? data.guildId : null,
        createdAt,
      });
    }
  }

  return stale;
}

function printSummary(staleRequests, stalePending) {
  console.log('\n=== Discord Bot 招待 一時データ クリーンアップ ===');
  console.log(`mode                     : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`pending max age (minutes): ${PENDING_MAX_AGE_MINUTES}`);
  console.log(`stale invite requests    : ${staleRequests.length}`);
  console.log(`stale pending invites    : ${stalePending.length}`);

  if (staleRequests.length > 0) {
    console.log('\n[discord_bot_invite_requests]');
    for (const item of staleRequests) {
      console.log(
        `- ${item.nonce} (team: ${item.teamId ?? '不明'}, ` +
          `expiresAt: ${item.expiresAt?.toISOString() ?? 'なし'})`
      );
    }
  }

  if (stalePending.length > 0) {
    console.log('\n[discord_bot_invite_pending]');
    for (const item of stalePending) {
      console.log(
        `- ${item.nonce} (team: ${item.teamId ?? '不明'}, guild: ${item.guildId ?? '不明'}, ` +
          `createdAt: ${item.createdAt?.toISOString() ?? 'なし'})`
      );
    }
  }

  if (!APPLY) {
    console.log('\n削除は行っていません。適用する場合は --apply を付けて再実行してください。');
  }
}

async function main() {
  const db = getAdminDb();
  const now = new Date();

  const [staleRequests, stalePending] = await Promise.all([
    findStaleInviteRequests(db, now),
    findStalePendingInvites(db, now),
  ]);

  printSummary(staleRequests, stalePending);

  if (!APPLY) return;

  for (const item of staleRequests) {
    await item.ref.delete();
  }
  for (const item of stalePending) {
    await item.ref.delete();
  }

  console.log('\n削除を適用しました。');
}

main().catch((error) => {
  console.error('\nDiscord招待 一時データクリーンアップに失敗しました:');
  console.error(error);
  process.exitCode = 1;
});
