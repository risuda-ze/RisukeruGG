import { logger } from 'firebase-functions/v2';
import { Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { createPublicThread, editMessage, sendMessage } from '../discord/rest';
import { resolveMemberMention, type MentionableMember } from '../discord/resolveMention';
import { formatMemberMention } from '../discord/mentionFormat';
import {
  buildBriefSummary,
  buildStepClosedMessage,
  buildStepInProgressMessage,
  buildStepReadyMessage,
  type SummaryBrief,
  type SummaryStep,
} from './summary';

/**
 * ブリーフと Discord スレッドの同期（I/O。IN-023〜IN-026）。
 *
 * - ブリーフ 1 本につき公開スレッドを 1 本作り、先頭に要約メッセージを置く
 * - 工程が着手可能になったら担当者へメンション付きの通知をボタン付きで投稿する
 * - 状態が変わるたびに要約を編集し、完了した通知はボタンを外す
 */

/** Web アプリの URL（stripeConfig と同じく Functions 環境変数 NEXT_PUBLIC_APP_URL を参照） */
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://risukeru.gg').replace(/\/$/, '');
}

export function briefUrl(briefId: string): string {
  return `${appBaseUrl()}/briefs/${briefId}`;
}

interface DiscordConfig {
  guildId?: string;
  channelId?: string;
  briefChannelId?: string;
  briefThreadsEnabled?: boolean;
  digestChannelId?: string;
  digestEnabled?: boolean;
  digestTime?: string;
}

export async function loadDiscordConfig(teamId: string): Promise<DiscordConfig | null> {
  const snap = await db.doc(`teams/${teamId}/discord/config`).get();
  return snap.exists ? (snap.data() as DiscordConfig) : null;
}

/** スレッド機能が使える設定か（Bot 連携済み・トグル ON・親チャンネルあり） */
export function threadChannelOf(config: DiscordConfig | null): string | null {
  if (!config?.guildId) return null;
  if (config.briefThreadsEnabled === false) return null;
  return config.briefChannelId ?? config.channelId ?? null;
}

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

/** Firestore の工程ドキュメントを要約用の形に変換する */
export function toSummaryStep(id: string, data: Record<string, unknown>): SummaryStep & { reminderDaysBefore: number; briefId: string } {
  const requiredFields = (data.requiredFields as Array<{ key: string; label: string; required?: boolean }> | undefined) ?? [];
  const fields = (data.fields as Record<string, unknown> | undefined) ?? {};
  const missingLabels = requiredFields
    .filter((f) => f.required && !hasValue(fields[f.key]))
    .map((f) => f.label);
  return {
    id,
    briefId: data.briefId as string,
    key: data.key as string,
    title: (data.title as string) ?? '',
    order: (data.order as number) ?? 0,
    status: (data.status as SummaryStep['status']) ?? 'waiting',
    assigneeId: (data.assigneeId as string | null | undefined) ?? null,
    dueDate: toDate(data.dueDate),
    missingLabels,
    optional: Boolean(data.optional),
    reminderDaysBefore: (data.reminderDaysBefore as number | undefined) ?? 1,
  };
}

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

export function toSummaryBrief(id: string, data: Record<string, unknown>): SummaryBrief {
  return {
    id,
    title: (data.title as string) ?? '',
    publishAt: toDate(data.publishAt),
    status: (data.status as SummaryBrief['status']) ?? 'planning',
  };
}

/** チームメンバーを読み、UID → 表示ラベル（メンション or 表示名）を作る */
export async function loadMembers(teamId: string): Promise<Map<string, MentionableMember>> {
  const snap = await db.collection(`teams/${teamId}/members`).get();
  const map = new Map<string, MentionableMember>();
  for (const d of snap.docs) {
    const m = d.data();
    map.set(d.id, {
      userId: d.id,
      displayName: (m.displayName as string) ?? 'メンバー',
      discordUsername: (m.discordUsername as string | null | undefined) ?? null,
      discordUserId: (m.discordUserId as string | null | undefined) ?? null,
    });
  }
  return map;
}

/** 要約用ラベル: 解決済み ID があればメンション、なければ表示名（検索はしない） */
export function memberLabelFn(members: Map<string, MentionableMember>) {
  return (uid: string | null): string => {
    if (!uid) return '担当未定';
    const m = members.get(uid);
    return m ? formatMemberMention(m) : '元メンバー';
  };
}

interface BriefContext {
  brief: SummaryBrief;
  briefData: Record<string, unknown>;
  steps: Array<SummaryStep & { reminderDaysBefore: number; briefId: string }>;
  members: Map<string, MentionableMember>;
  config: DiscordConfig | null;
}

export async function loadBriefContext(teamId: string, briefId: string): Promise<BriefContext | null> {
  const briefRef = db.doc(`teams/${teamId}/briefs/${briefId}`);
  const [briefSnap, stepsSnap, members, config] = await Promise.all([
    briefRef.get(),
    briefRef.collection('steps').orderBy('order', 'asc').get(),
    loadMembers(teamId),
    loadDiscordConfig(teamId),
  ]);
  if (!briefSnap.exists) return null;
  const briefData = briefSnap.data() as Record<string, unknown>;
  return {
    brief: toSummaryBrief(briefSnap.id, briefData),
    briefData,
    steps: stepsSnap.docs.map((d) => toSummaryStep(d.id, d.data() as Record<string, unknown>)),
    members,
    config,
  };
}

/**
 * ブリーフのスレッドと要約メッセージを用意する。既にあれば何もしない。
 * 返り値はスレッド ID（作れなければ null）。
 */
export async function ensureBriefThread(teamId: string, briefId: string, ctx: BriefContext): Promise<string | null> {
  const existing = ctx.briefData.discord as { threadId?: string } | null | undefined;
  if (existing?.threadId) return existing.threadId;

  const channelId = threadChannelOf(ctx.config);
  if (!channelId) return null;

  const threadId = await createPublicThread(channelId, ctx.brief.title || 'ブリーフ');
  if (!threadId) return null;

  const summary = buildBriefSummary({
    brief: ctx.brief,
    steps: ctx.steps,
    memberLabel: memberLabelFn(ctx.members),
    briefUrl: briefUrl(briefId),
    now: new Date(),
  });
  const summaryMessageId = await sendMessage(threadId, { content: summary, allowed_mentions: { parse: [] } });

  await db.doc(`teams/${teamId}/briefs/${briefId}`).update({
    discord: { threadId, summaryMessageId: summaryMessageId ?? '', channelId },
  });
  logger.info('ブリーフのスレッドを作成しました', { teamId, briefId, threadId });
  return threadId;
}

/** 要約メッセージを現在の状態で書き換える */
export async function refreshBriefSummary(teamId: string, briefId: string, ctx: BriefContext): Promise<void> {
  const link = ctx.briefData.discord as { threadId?: string; summaryMessageId?: string } | null | undefined;
  if (!link?.threadId || !link.summaryMessageId) return;
  const summary = buildBriefSummary({
    brief: ctx.brief,
    steps: ctx.steps,
    memberLabel: memberLabelFn(ctx.members),
    briefUrl: briefUrl(briefId),
    now: new Date(),
  });
  await editMessage(link.threadId, link.summaryMessageId, { content: summary, allowed_mentions: { parse: [] } });
}

/**
 * 着手可能通知を投稿する。二重投稿を避けるため、まずトランザクションで
 * `discordMessageId` を予約（pending）してから送信する。
 */
export async function postStepReadyNotification(
  teamId: string,
  briefId: string,
  stepId: string,
  ctx: BriefContext
): Promise<void> {
  const link = ctx.briefData.discord as { threadId?: string } | null | undefined;
  const guildId = ctx.config?.guildId;
  if (!link?.threadId || !guildId) return;
  const step = ctx.steps.find((s) => s.id === stepId);
  if (!step || step.status !== 'ready') return;

  const stepRef = db.doc(`teams/${teamId}/briefs/${briefId}/steps/${stepId}`);
  const claimed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(stepRef);
    if (!snap.exists) return false;
    const current = snap.data()?.discordMessageId as string | null | undefined;
    if (current) return false;
    tx.update(stepRef, { discordMessageId: `pending:${Date.now()}` });
    return true;
  });
  if (!claimed) return;

  // 担当者のメンションを解決（未解決なら表示名 + 案内）
  let mention = '担当未定';
  let unresolvedHint = false;
  if (step.assigneeId) {
    const member = ctx.members.get(step.assigneeId);
    if (member) {
      mention = await resolveMemberMention(teamId, guildId, member);
      unresolvedHint = !mention.startsWith('<@');
    }
  }

  const payload = buildStepReadyMessage({
    teamId,
    briefId,
    step,
    assigneeMention: mention,
    briefUrl: briefUrl(briefId),
    unresolvedHint,
  });
  const messageId = await sendMessage(link.threadId, {
    ...payload,
    allowed_mentions: { parse: ['users'] },
  });
  // 送信できなければ予約を戻し、次の機会に再送できるようにする
  await stepRef.update({ discordMessageId: messageId ?? null });
}

/** 通知メッセージを現在の状態に合わせて書き換える（完了・スキップ・作業中） */
export async function refreshStepMessage(teamId: string, briefId: string, stepId: string, ctx: BriefContext): Promise<void> {
  const link = ctx.briefData.discord as { threadId?: string } | null | undefined;
  const step = ctx.steps.find((s) => s.id === stepId);
  if (!link?.threadId || !step) return;
  const snap = await db.doc(`teams/${teamId}/briefs/${briefId}/steps/${stepId}`).get();
  const messageId = snap.data()?.discordMessageId as string | null | undefined;
  if (!messageId || messageId.startsWith('pending:')) return;

  if (step.status === 'done' || step.status === 'skipped') {
    await editMessage(link.threadId, messageId, buildStepClosedMessage(step));
  } else if (step.status === 'in_progress') {
    await editMessage(link.threadId, messageId, buildStepInProgressMessage({ teamId, briefId, step, briefUrl: briefUrl(briefId) }));
  }
}
