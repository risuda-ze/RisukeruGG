import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { DiscordSession } from '@/types/entities';

/**
 * セッションがタイムアウトしているか確認する（30分無操作で自動リセット）。
 * discord_sessions/{guildId} の updatedAt を基準にする。
 */
export function isSessionExpired(session: DiscordSession): boolean {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return session.updatedAt < thirtyMinutesAgo;
}

/**
 * discord_sessions/{guildId} からセッションを取得する。
 * セッションキーはDiscordサーバーID（guildId）。個人ユーザーは追跡しない。
 */
export async function getSession(guildId: string): Promise<DiscordSession | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`discord_sessions/${guildId}`).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  // 旧形式（pendingProposal: 単一オブジェクト）のセッションが残っている場合は配列に包んで互換を保つ
  const legacyProposal = data.pendingProposal as Record<string, unknown> | undefined;
  const pendingProposals =
    (data.pendingProposals as Array<Record<string, unknown>> | undefined) ??
    (legacyProposal ? [legacyProposal] : undefined);

  return {
    guildId: data.guildId as string,
    teamId: data.teamId as string,
    messages: (data.messages as DiscordSession['messages']) ?? [],
    pendingProposals,
    initiatorDiscordUserId: (data.initiatorDiscordUserId as string | undefined) ?? undefined,
    updatedAt: (data.updatedAt as { toDate: () => Date }).toDate(),
  };
}

/** discord_sessions/{guildId} を新規作成または更新する */
export async function upsertSession(
  guildId: string,
  update: Partial<Omit<DiscordSession, 'updatedAt'>>
): Promise<void> {
  const db = getAdminFirestore();
  // undefined の値は Firestore がエラーにするため除外する（フィールド削除は clearPendingProposals を使う）
  const sanitized = Object.fromEntries(
    Object.entries(update).filter(([, v]) => v !== undefined)
  );
  await db.doc(`discord_sessions/${guildId}`).set(
    {
      ...sanitized,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * 確認待ちプロポーザルのみ削除して会話履歴は保持する（「修正する」ボタン用）。
 * 旧形式の pendingProposal フィールドも合わせて削除する。
 */
export async function clearPendingProposals(guildId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(`discord_sessions/${guildId}`).set(
    {
      pendingProposals: FieldValue.delete(),
      pendingProposal: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** discord_sessions/{guildId} を削除する */
export async function deleteSession(guildId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(`discord_sessions/${guildId}`).delete();
}
