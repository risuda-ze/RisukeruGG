#!/usr/bin/env node

/**
 * Discord スキーマ移行スクリプト
 *
 * 目的:
 * - 旧 discord_sessions/{discordUserId} を現行の discord_sessions/{guildId} へ移行する
 * - teams/{teamId}/discord/config の必須既定値を正規化する
 *
 * 前提:
 * - FIREBASE_SERVICE_ACCOUNT_KEY にサービスアカウント JSON を文字列で設定する
 * - 既定は dry-run。実際の書き込みは --apply を指定した場合のみ行う
 *
 * 使い方:
 *   node scripts/migrate-discord-schema.mjs
 *   node scripts/migrate-discord-schema.mjs --apply
 *   node scripts/migrate-discord-schema.mjs --apply --prune-legacy
 *   node scripts/migrate-discord-schema.mjs --team=<teamId>
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
const PRUNE_LEGACY = hasFlag('prune-legacy');
const TEAM_FILTER = getArgValue('team');

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

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry) =>
        isRecord(entry) &&
        (entry.role === 'user' || entry.role === 'assistant') &&
        typeof entry.content === 'string'
    )
    .map((entry) => ({ role: entry.role, content: entry.content }));
}

function normalizePendingProposal(value) {
  return isRecord(value) ? value : undefined;
}

function isLegacySessionDoc(docId, data) {
  return (
    typeof data.guildId !== 'string' &&
    (typeof data.discordUserId === 'string' || typeof data.risukeruUserId === 'string' || docId !== data.guildId)
  );
}

function pickPreferredSession(current, candidate) {
  if (!current) return candidate;

  const currentAt = current.updatedAt?.getTime?.() ?? 0;
  const candidateAt = candidate.updatedAt?.getTime?.() ?? 0;

  if (candidateAt > currentAt) return candidate;
  return current;
}

function buildConfigPatch(data) {
  const patch = {};

  if (typeof data.webhookUrl !== 'string') patch.webhookUrl = '';
  if (typeof data.notifyOnCreate !== 'boolean') patch.notifyOnCreate = false;
  if (typeof data.notifyBefore1h !== 'boolean') patch.notifyBefore1h = false;
  if (typeof data.notifyBefore15min !== 'boolean') patch.notifyBefore15min = false;

  return patch;
}

async function loadDiscordConfigs(db) {
  const configQuery = db.collectionGroup('discord');
  const snap = await configQuery.get();
  const configsByTeamId = new Map();
  const patches = [];

  for (const doc of snap.docs) {
    const teamId = doc.ref.parent.parent?.id;
    if (!teamId) continue;
    if (TEAM_FILTER && teamId !== TEAM_FILTER) continue;

    const data = doc.data();
    configsByTeamId.set(teamId, {
      ref: doc.ref,
      guildId: typeof data.guildId === 'string' ? data.guildId : null,
      channelId: typeof data.channelId === 'string' ? data.channelId : null,
      webhookUrl: typeof data.webhookUrl === 'string' ? data.webhookUrl : '',
      notifyOnCreate: typeof data.notifyOnCreate === 'boolean' ? data.notifyOnCreate : false,
      notifyBefore1h: typeof data.notifyBefore1h === 'boolean' ? data.notifyBefore1h : false,
      notifyBefore15min:
        typeof data.notifyBefore15min === 'boolean' ? data.notifyBefore15min : false,
    });

    const patch = buildConfigPatch(data);
    if (Object.keys(patch).length > 0) {
      patches.push({ teamId, ref: doc.ref, patch });
    }
  }

  return { configsByTeamId, configPatches: patches };
}

async function loadSessions(db) {
  const sessionsRef = db.collection('discord_sessions');
  const query = TEAM_FILTER ? sessionsRef.where('teamId', '==', TEAM_FILTER) : sessionsRef;
  const snap = await query.get();

  const currentByGuildId = new Map();
  const legacySessions = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const updatedAt = toDate(data.updatedAt) ?? new Date(0);

    if (typeof data.guildId === 'string' && doc.id === data.guildId) {
      currentByGuildId.set(doc.id, {
        source: 'current',
        docId: doc.id,
        teamId: typeof data.teamId === 'string' ? data.teamId : null,
        guildId: data.guildId,
        messages: normalizeMessages(data.messages),
        pendingProposal: normalizePendingProposal(data.pendingProposal),
        updatedAt,
      });
      continue;
    }

    if (isLegacySessionDoc(doc.id, data)) {
      legacySessions.push({
        source: 'legacy',
        docId: doc.id,
        teamId: typeof data.teamId === 'string' ? data.teamId : null,
        discordUserId: typeof data.discordUserId === 'string' ? data.discordUserId : null,
        risukeruUserId: typeof data.risukeruUserId === 'string' ? data.risukeruUserId : null,
        messages: normalizeMessages(data.messages),
        pendingProposal: normalizePendingProposal(data.pendingProposal),
        updatedAt,
      });
    }
  }

  return { currentByGuildId, legacySessions };
}

function buildMigrationPlan(currentByGuildId, legacySessions, configsByTeamId) {
  const writes = [];
  const deletes = new Set();
  const warnings = [];
  const selectedByGuildId = new Map(currentByGuildId);
  let collisionCount = 0;
  let overwriteCurrentCount = 0;

  for (const legacy of legacySessions) {
    if (!legacy.teamId) {
      warnings.push({ type: 'missing-team-id', legacyDocId: legacy.docId });
      continue;
    }

    const config = configsByTeamId.get(legacy.teamId);
    if (!config?.guildId) {
      warnings.push({
        type: 'missing-guild-id',
        legacyDocId: legacy.docId,
        teamId: legacy.teamId,
      });
      continue;
    }

    if (legacy.docId !== config.guildId) {
      deletes.add(legacy.docId);
    }

    const candidate = {
      source: 'legacy',
      docId: legacy.docId,
      teamId: legacy.teamId,
      guildId: config.guildId,
      messages: legacy.messages,
      pendingProposal: legacy.pendingProposal,
      updatedAt: legacy.updatedAt,
    };

    const existing = selectedByGuildId.get(config.guildId);
    if (existing) {
      collisionCount += 1;
    }

    const selected = pickPreferredSession(existing, candidate);
    selectedByGuildId.set(config.guildId, selected);
  }

  for (const [guildId, selected] of selectedByGuildId.entries()) {
    if (selected.source !== 'legacy') continue;

    const current = currentByGuildId.get(guildId);
    if (current) {
      overwriteCurrentCount += 1;
    }

    writes.push({
      guildId,
      payload: {
        guildId,
        teamId: selected.teamId,
        messages: selected.messages,
        ...(selected.pendingProposal ? { pendingProposal: selected.pendingProposal } : {}),
        updatedAt: selected.updatedAt,
      },
      legacyDocId: selected.docId,
      overwritesCurrent: Boolean(current),
    });

    deletes.push(selected.docId);
  }

  return {
    writes,
    deletes: [...deletes],
    warnings,
    collisionCount,
    overwriteCurrentCount,
  };
}

async function applyConfigPatches(configPatches) {
  for (const patch of configPatches) {
    await patch.ref.set(patch.patch, { merge: true });
  }
}

async function applySessionWrites(db, writes, deletes) {
  for (const write of writes) {
    await db.doc(`discord_sessions/${write.guildId}`).set(write.payload, { merge: true });
  }

  if (!PRUNE_LEGACY) return;

  for (const docId of deletes) {
    await db.doc(`discord_sessions/${docId}`).delete();
  }
}

function printSummary({
  configsByTeamId,
  configPatches,
  currentByGuildId,
  legacySessions,
  plan,
}) {
  console.log('\n=== Discord スキーマ移行 ===');
  console.log(`mode            : ${APPLY ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`team filter     : ${TEAM_FILTER ?? '(none)'}`);
  console.log(`prune legacy    : ${APPLY && PRUNE_LEGACY ? 'YES' : 'NO'}`);
  console.log(`discord configs : ${configsByTeamId.size}`);
  console.log(`config patches  : ${configPatches.length}`);
  console.log(`current sessions: ${currentByGuildId.size}`);
  console.log(`legacy sessions : ${legacySessions.length}`);
  console.log(`planned writes  : ${plan.writes.length}`);
  console.log(`collisions      : ${plan.collisionCount}`);
  console.log(`overwrite current: ${plan.overwriteCurrentCount}`);
  console.log(`warnings        : ${plan.warnings.length}`);

  if (configPatches.length > 0) {
    console.log('\n[config patches]');
    for (const patch of configPatches) {
      console.log(`- ${patch.teamId}: ${Object.keys(patch.patch).join(', ')}`);
    }
  }

  if (plan.writes.length > 0) {
    console.log('\n[session writes]');
    for (const write of plan.writes) {
      console.log(
        `- discord_sessions/${write.legacyDocId} -> discord_sessions/${write.guildId}` +
          (write.overwritesCurrent ? ' (overwrite current)' : '')
      );
    }
  }

  if (plan.warnings.length > 0) {
    console.log('\n[warnings]');
    for (const warning of plan.warnings) {
      if (warning.type === 'missing-guild-id') {
        console.log(
          `- legacy session ${warning.legacyDocId}: team ${warning.teamId} に guildId がないため自動移行不可`
        );
      } else if (warning.type === 'missing-team-id') {
        console.log(`- legacy session ${warning.legacyDocId}: teamId がないため自動移行不可`);
      }
    }
  }

  if (!APPLY) {
    console.log('\n変更は適用していません。適用する場合は --apply を付けて再実行してください。');
  }
}

async function main() {
  const db = getAdminDb();
  const [{ configsByTeamId, configPatches }, { currentByGuildId, legacySessions }] =
    await Promise.all([loadDiscordConfigs(db), loadSessions(db)]);

  const plan = buildMigrationPlan(currentByGuildId, legacySessions, configsByTeamId);
  printSummary({
    configsByTeamId,
    configPatches,
    currentByGuildId,
    legacySessions,
    plan,
  });

  if (!APPLY) return;

  await applyConfigPatches(configPatches);
  await applySessionWrites(db, plan.writes, plan.deletes);

  console.log('\n移行を適用しました。');
}

main().catch((error) => {
  console.error('\nDiscord schema migration failed:');
  console.error(error);
  process.exitCode = 1;
});