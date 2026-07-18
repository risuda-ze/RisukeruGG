#!/usr/bin/env node

/**
 * クローズドベータ許可リスト（beta_allowlist）管理スクリプト（T11）
 *
 * Firestore ルートコレクション `beta_allowlist/{email}`（ドキュメント ID = 小文字正規化メール）
 * を Admin SDK 経由で操作する。メールアドレスはソースに一切記録せず、実行時引数で渡す。
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 *   （scripts/cleanup-discord-invite-temp.mjs と同じ初期化パターン）
 *
 * 使い方:
 *   node scripts/beta-allowlist.mjs add    user@example.com [別のメール...]
 *   node scripts/beta-allowlist.mjs remove user@example.com [別のメール...]
 *   node scripts/beta-allowlist.mjs list
 *
 * 補足:
 * - ゲート自体の有効/無効は app_config/beta { enabled } で管理する（本スクリプト対象外）。
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const [, , command, ...emailArgs] = process.argv;

/** メールを allowlist ドキュメント ID 用に正規化する（前後空白除去＋小文字化）。 */
function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** ざっくりしたメール形式チェック（誤登録防止用の最小限）。 */
function looksLikeEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

function printUsage() {
  console.log(
    [
      'クローズドベータ許可リスト管理スクリプト',
      '',
      '使い方:',
      '  node scripts/beta-allowlist.mjs add    <email> [email...]',
      '  node scripts/beta-allowlist.mjs remove <email> [email...]',
      '  node scripts/beta-allowlist.mjs list',
    ].join('\n')
  );
}

async function addEmails(db, emails) {
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    if (!looksLikeEmail(email)) {
      console.warn(`  ⚠ スキップ（メール形式ではありません）: ${raw}`);
      continue;
    }
    await db.collection('beta_allowlist').doc(email).set(
      {
        email,
        addedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`  ✓ 追加: ${email}`);
  }
}

async function removeEmails(db, emails) {
  for (const raw of emails) {
    const email = normalizeEmail(raw);
    await db.collection('beta_allowlist').doc(email).delete();
    console.log(`  ✓ 削除: ${email}`);
  }
}

async function listEmails(db) {
  const snap = await db.collection('beta_allowlist').get();
  console.log(`\n=== beta_allowlist（${snap.size} 件） ===`);
  if (snap.empty) {
    console.log('  （登録なし）');
    return;
  }
  const ids = snap.docs.map((doc) => doc.id).sort();
  for (const id of ids) {
    console.log(`  - ${id}`);
  }
}

async function main() {
  if (!command || command === 'help' || command === '--help') {
    printUsage();
    return;
  }

  const db = getAdminDb();

  switch (command) {
    case 'add':
      if (emailArgs.length === 0) {
        throw new Error('add コマンドには 1 件以上のメールアドレスを指定してください');
      }
      console.log('\n=== beta_allowlist へ追加 ===');
      await addEmails(db, emailArgs);
      break;

    case 'remove':
      if (emailArgs.length === 0) {
        throw new Error('remove コマンドには 1 件以上のメールアドレスを指定してください');
      }
      console.log('\n=== beta_allowlist から削除 ===');
      await removeEmails(db, emailArgs);
      break;

    case 'list':
      await listEmails(db);
      break;

    default:
      console.error(`不明なコマンド: ${command}\n`);
      printUsage();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nbeta-allowlist スクリプトの実行に失敗しました:');
  console.error(error);
  process.exitCode = 1;
});
