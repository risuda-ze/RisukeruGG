import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { DiscordSession } from '@/types/entities';

/** セッションがタイムアウトしているか確認する（30分無操作で自動リセット） */
export function isSessionExpired(session: DiscordSession): boolean {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  return session.updatedAt < thirtyMinutesAgo;
}

/** discord_sessions/{discordUserId} からセッションを取得する */
export async function getSession(discordUserId: string): Promise<DiscordSession | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`discord_sessions/${discordUserId}`).get();
  if (!snap.exists) return null;

  const data = snap.data()!;
  return {
    discordUserId: data.discordUserId as string,
    risukeruUserId: data.risukeruUserId as string,
    teamId: data.teamId as string,
    messages: (data.messages as DiscordSession['messages']) ?? [],
    pendingProposal: (data.pendingProposal as Record<string, unknown> | undefined) ?? undefined,
    updatedAt: (data.updatedAt as { toDate: () => Date }).toDate(),
  };
}

/** discord_sessions/{discordUserId} を新規作成または更新する */
export async function upsertSession(
  discordUserId: string,
  update: Partial<Omit<DiscordSession, 'updatedAt'>>
): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(`discord_sessions/${discordUserId}`).set(
    {
      ...update,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/** discord_sessions/{discordUserId} を削除する */
export async function deleteSession(discordUserId: string): Promise<void> {
  const db = getAdminFirestore();
  await db.doc(`discord_sessions/${discordUserId}`).delete();
}
