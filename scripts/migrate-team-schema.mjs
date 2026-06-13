#!/usr/bin/env node

/**
 * Team スキーマ最新化スクリプト
 *
 * 目的:
 * 1. teams/{teamId} の ownerId: string → operatorUids: string[] に正規化
 * 2. teams/{teamId}/taskStatuses/{id} に icon: null を追加（未設定ドキュメント対象）
 * 3. teams/{teamId}/taskCategories/{id} に icon: null を追加（未設定ドキュメント対象）
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON 文字列を設定する
 * - 既定は dry-run。実際の書き込みは --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/migrate-team-schema.mjs
 *   node scripts/migrate-team-schema.mjs --apply
 *   node scripts/migrate-team-schema.mjs --team=<teamId>
 *   node scripts/migrate-team-schema.mjs --apply --team=<teamId>
 *
 * オプション:
 *   --apply          実際に書き込みを実行（既定は dry-run）
 *   --team=<id>      特定チームのみ対象にする
 *   --skip-owner     ownerId 正規化をスキップする
 *   --skip-icon      icon バックフィルをスキップする
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
const TEAM_FILTER = getArgValue('team');
const SKIP_OWNER = hasFlag('skip-owner');
const SKIP_ICON = hasFlag('skip-icon');
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
    return snap.exists ? [{ id: snap.id, ref: snap.ref, data: snap.data() }] : [];
  }
  const snap = await teamsRef.get();
  return snap.docs.map((doc) => ({ id: doc.id, ref: doc.ref, data: doc.data() }));
}

function buildOwnerPatch(team) {
  const data = team.data;
  if (Array.isArray(data.operatorUids) && data.operatorUids.length > 0) {
    return null;
  }
  if (typeof data.ownerId !== 'string' || !data.ownerId) {
    return null;
  }
  return { operatorUids: [data.ownerId] };
}

async function buildIconPatches(team) {
  const patches = [];

  const [statusSnap, categorySnap] = await Promise.all([
    team.ref.collection('taskStatuses').get(),
    team.ref.collection('taskCategories').get(),
  ]);

  for (const doc of statusSnap.docs) {
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, 'icon')) {
      patches.push({ ref: doc.ref, path: `taskStatuses/${doc.id}`, patch: { icon: null } });
    }
  }

  for (const doc of categorySnap.docs) {
    const data = doc.data();
    if (!Object.prototype.hasOwnProperty.call(data, 'icon')) {
      patches.push({ ref: doc.ref, path: `taskCategories/${doc.id}`, patch: { icon: null } });
    }
  }

  return patches;
}

async function commitBatches(db, operations) {
  for (let i = 0; i < operations.length; i += MAX_BATCH_OPS) {
    const batch = db.batch();
    const chunk = operations.slice(i, i + MAX_BATCH_OPS);
    for (const op of chunk) {
      batch.update(op.ref, op.data);
    }
    await batch.commit();
  }
}

async function main() {
  console.log('\n=== Team スキーマ最新化 ===');
  console.log(`mode        : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`team filter : ${TEAM_FILTER ?? '(none)'}`);
  console.log(`skip-owner  : ${SKIP_OWNER}`);
  console.log(`skip-icon   : ${SKIP_ICON}\n`);

  const db = getAdminDb();
  const teams = await loadTeams(db);
  console.log(`teams loaded: ${teams.length}`);

  const ownerOps = [];
  const iconOps = [];
  const warnings = [];

  for (const team of teams) {
    if (!SKIP_OWNER) {
      const patch = buildOwnerPatch(team);
      if (patch) {
        console.log(`  [owner] ${team.id}: ownerId="${team.data.ownerId}" → operatorUids=[...]`);
        ownerOps.push({ ref: team.ref, data: patch });
      }

      if (!Array.isArray(team.data.operatorUids) && !team.data.ownerId) {
        warnings.push({ type: 'missing-owner', teamId: team.id });
        console.log(`  [warn]  ${team.id}: operatorUids も ownerId も存在しない`);
      }
    }

    if (!SKIP_ICON) {
      const patches = await buildIconPatches(team);
      for (const p of patches) {
        console.log(`  [icon]  teams/${team.id}/${p.path}: icon フィールド追加`);
        iconOps.push({ ref: p.ref, data: p.patch });
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`owner patches : ${ownerOps.length}`);
  console.log(`icon patches  : ${iconOps.length}`);
  console.log(`warnings      : ${warnings.length}`);

  if (!APPLY) {
    console.log('\n変更は適用していません。適用する場合は --apply を付けて再実行してください。');
    return;
  }

  const allOps = [
    ...ownerOps.map((op) => ({ ref: op.ref, data: op.data })),
    ...iconOps.map((op) => ({ ref: op.ref, data: op.data })),
  ];

  if (allOps.length === 0) {
    console.log('\n適用対象がありません。移行済みです。');
    return;
  }

  await commitBatches(db, allOps);
  console.log(`\n${allOps.length} 件の変更を適用しました。`);
}

main().catch((error) => {
  console.error('\nTeam schema migration failed:');
  console.error(error);
  process.exitCode = 1;
});
