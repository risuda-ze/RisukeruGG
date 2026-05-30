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
  return {
    guildId: data.guildId as string,
    teamId: data.teamId as string,
    messages: (data.messages as DiscordSession['messages']) ?? [],
    pendingProposal: (data.pendingProposal as Record<string, unknown> | undefined) ?? undefined,
    updatedAt: (data.updatedAt as { toDate: () => Date }).toDate(),
  };
}

/** discord_sessions/{guildId} を新規作成または更新する */
export async function upsertSession(
  guildId: string,
  update: Partial<Omit<DiscordSession, 'updatedAt'>>
): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(`discord_sessions/${guildId}`).set(
    {
      ...update,
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
