#!/usr/bin/env node
/**
 * teams/{teamId}/kanbanColumns -> teams/{teamId}/taskStatuses 移行スクリプト
 *
 * 使い方:
 *   node scripts/migrate-task-statuses.mjs
 *   node scripts/migrate-task-statuses.mjs --apply
 *   node scripts/migrate-task-statuses.mjs --apply --keep-source
 *
 * オプション:
 *   --project=<projectId>   既定: demo-risukeru
 *   --host=<host:port>      既定: localhost:8080 (Firestore Emulator)
 *   --apply                 実際に書き込み/削除を実行
 *   --keep-source           元コレクション kanbanColumns を削除しない
 *
 * 注記:
 *   - 既定は dry-run（変更なし）です。
 *   - Firestore Emulator 前提。Authorization: Bearer owner を利用します。
 */

const argv = process.argv.slice(2);

function getArgValue(name, defaultValue) {
  const prefix = `--${name}=`;
  const found = argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

function hasFlag(name) {
  return argv.includes(`--${name}`);
}

const PROJECT_ID = getArgValue('project', 'demo-risukeru');
const FIRESTORE_HOST = getArgValue('host', 'localhost:8080');
const APPLY = hasFlag('apply');
const KEEP_SOURCE = hasFlag('keep-source');
const FS_BASE = `http://${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toDocPath(fullName) {
  const marker = '/documents/';
  const index = fullName.indexOf(marker);
  if (index === -1) {
    throw new Error(`Unexpected document name: ${fullName}`);
  }
  return fullName.slice(index + marker.length);
}

function lastPathSegment(pathLike) {
  const parts = pathLike.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${text}`);
  }

  if (response.status === 204) return {};
  return response.json();
}

async function listDocuments(collectionPath) {
  const docs = [];
  let pageToken = null;

  while (true) {
    const query = new URLSearchParams({ pageSize: '200' });
    if (pageToken) query.set('pageToken', pageToken);

    const url = `${FS_BASE}/${collectionPath}?${query.toString()}`;
    const data = await requestJson(url, { method: 'GET' });

    if (Array.isArray(data.documents)) {
      docs.push(...data.documents);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return docs;
}

async function upsertDocument(documentPath, fields) {
  const url = `${FS_BASE}/${documentPath}`;
  await requestJson(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

async function deleteDocument(documentPath) {
  const url = `${FS_BASE}/${documentPath}`;
  await requestJson(url, { method: 'DELETE' });
}

async function main() {
  console.log('\n=== taskStatuses 移行スクリプト ===');
  console.log(`project: ${PROJECT_ID}`);
  console.log(`host: ${FIRESTORE_HOST}`);
  console.log(`mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`source delete: ${APPLY && !KEEP_SOURCE ? 'YES' : 'NO'}\n`);

  const teams = await listDocuments('teams');

  let scannedTeams = 0;
  let sourceDocs = 0;
  let copiedDocs = 0;
  let deletedDocs = 0;

  for (const teamDoc of teams) {
    scannedTeams += 1;
    const teamPath = toDocPath(teamDoc.name);
    const teamId = lastPathSegment(teamPath);

    const fromPath = `teams/${teamId}/kanbanColumns`;
    const toBase = `teams/${teamId}/taskStatuses`;

    const columns = await listDocuments(fromPath);
    if (columns.length === 0) {
      console.log(`- ${teamId}: source empty (skip)`);
      continue;
    }

    console.log(`- ${teamId}: ${columns.length} docs`);
    sourceDocs += columns.length;

    for (const colDoc of columns) {
      const sourceDocPath = toDocPath(colDoc.name);
      const docId = lastPathSegment(sourceDocPath);
      const targetDocPath = `${toBase}/${docId}`;
      const fields = colDoc.fields ?? {};

      if (APPLY) {
        await upsertDocument(targetDocPath, fields);
        copiedDocs += 1;

        if (!KEEP_SOURCE) {
          await deleteDocument(sourceDocPath);
          deletedDocs += 1;
        }
      } else {
        console.log(`  DRY-RUN copy: ${sourceDocPath} -> ${targetDocPath}`);
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`teams scanned : ${scannedTeams}`);
  console.log(`source docs   : ${sourceDocs}`);
  console.log(`copied docs   : ${copiedDocs}`);
  console.log(`deleted docs  : ${deletedDocs}`);

  if (!APPLY) {
    console.log('\n変更は適用していません。適用する場合は --apply を付けて再実行してください。');
  }
}

main().catch((err) => {
  console.error('\nMigration failed:');
  console.error(err);
  process.exitCode = 1;
});
