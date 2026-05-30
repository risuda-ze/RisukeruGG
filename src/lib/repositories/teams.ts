import { doc, getDoc, collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase/client';
import type { Team, TeamMember, UserRole, DiscordTeamConfig } from '@/types/entities';

const functions = getFunctions(undefined, 'asia-northeast1');

// Firestoreドキュメントを型付きエンティティに変換
function toTeam(id: string, data: Record<string, unknown>): Team {
  // operatorUids がない旧ドキュメントは ownerId から変換
  const operatorUids = Array.isArray(data.operatorUids)
    ? (data.operatorUids as string[])
    : data.ownerId
      ? [data.ownerId as string]
      : [];
  return {
    id,
    name: data.name as string,
    operatorUids,
    teamCode: data.teamCode as string,
    createdAt: (data.createdAt as { toDate: () => Date }).toDate(),
  };
}

function toTeamMember(id: string, data: Record<string, unknown>): TeamMember {
  return {
    userId: id,
    role: data.role as UserRole,
    displayName: data.displayName as string,
    avatarUrl: (data.avatarUrl as string | null) ?? null,
    plan: data.plan as 'light' | 'party',
    joinedAt: (data.joinedAt as { toDate: () => Date }).toDate(),
  };
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  if (!snap.exists()) return null;
  return toTeam(snap.id, snap.data() as Record<string, unknown>);
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { getDocs } = await import('firebase/firestore');
  const snap = await getDocs(collection(db, 'teams', teamId, 'members'));
  return snap.docs.map((d) => toTeamMember(d.id, d.data() as Record<string, unknown>));
}

export function subscribeTeam(teamId: string, callback: (team: Team | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'teams', teamId), (snap) => {
    callback(snap.exists() ? toTeam(snap.id, snap.data() as Record<string, unknown>) : null);
  });
}

export function subscribeMembers(
  teamId: string,
  callback: (members: TeamMember[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'teams', teamId, 'members'), (snap) => {
    callback(snap.docs.map((d) => toTeamMember(d.id, d.data() as Record<string, unknown>)));
  });
}

// Admin SDK 経由で Security Rules をバイパスするため CF を使用する
const _updateMemberRoleCF = httpsCallable<
  { teamId: string; targetUserId: string; role: UserRole },
  { success: boolean }
>(functions, 'updateMemberRole');

export async function updateMemberRole(
  teamId: string,
  memberId: string,
  role: UserRole
): Promise<void> {
  await _updateMemberRoleCF({ teamId, targetUserId: memberId, role });
}

// Cloud Functions 呼び出し
export const createTeam = httpsCallable<{ name: string }, { teamId: string; teamCode: string }>(
  functions,
  'createTeam'
);

export const joinTeam = httpsCallable<{ teamCode: string }, { success: boolean; teamId: string }>(
  functions,
  'joinTeam'
);

export const resetTeamCode = httpsCallable<{ teamId: string }, { newTeamCode: string }>(
  functions,
  'resetTeamCode'
);

export const removeTeamMember = httpsCallable<
  { teamId: string; targetUserId: string },
  { success: boolean }
>(functions, 'removeTeamMember');

export const deleteAccount = httpsCallable<
  { operatorAssignments?: { teamId: string; newOperatorId: string }[] },
  { success: boolean }
>(functions, 'deleteAccount');

export const dissolveTeam = httpsCallable<void, { success: boolean }>(functions, 'dissolveTeam');

export const leaveSpecificTeam = httpsCallable<
  { teamId: string },
  { success: boolean; newActiveTeamId: string }
>(functions, 'leaveSpecificTeam');

export const switchActiveTeam = httpsCallable<
  { teamId: string },
  { success: boolean; teamId: string }
>(functions, 'switchActiveTeam');

// Discord 通知設定の更新（Cloud Function 経由 — Admin SDK で Security Rules をバイパス）
export const updateDiscordSettings = httpsCallable<
  {
    teamId: string;
    webhookUrl: string;
    guildId?: string;
    channelId?: string;
    notifyOnCreate: boolean;
    notifyBefore1h: boolean;
    notifyBefore15min: boolean;
  },
  { success: boolean }
>(functions, 'updateDiscordSettings');

/** Discord 通知設定を取得する。operator のみアクセス可能（Firestore ルールで制限）。 */
export async function getDiscordSettings(teamId: string): Promise<DiscordTeamConfig | null> {
  const snap = await getDoc(doc(db, 'teams', teamId, 'discord', 'config'));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  return {
    webhookUrl: (data.webhookUrl as string) ?? '',
    guildId: (data.guildId as string | undefined) ?? undefined,
    channelId: (data.channelId as string | undefined) ?? undefined,
    notifyOnCreate: (data.notifyOnCreate as boolean) ?? false,
    notifyBefore1h: (data.notifyBefore1h as boolean) ?? false,
    notifyBefore15min: (data.notifyBefore15min as boolean) ?? false,
  };
}

/**
 * guildId からチームIDを検索する。
 * discord_sessions/{guildId} と連動して使うためクライアントからは呼ばない（Bot APIルート専用）。
 * クライアントサイドからは呼び出し不可のため、この関数は将来的にAPIルートのみで使用する。
 */
export async function getTeamIdByGuildId(guildId: string): Promise<string | null> {
  // collectionGroup クエリは Firestore インデックスが必要な場合がある
  // teams/{teamId}/discord/config の guildId フィールドを横断検索
  const { collectionGroup, query, where, limit, getDocs } = await import('firebase/firestore');
  const q = query(
    collectionGroup(db, 'discord'),
    where('guildId', '==', guildId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  // discord サブコレクションの親（teams/{teamId}）の ID を返す
  const teamRef = snap.docs[0]!.ref.parent.parent;
  return teamRef?.id ?? null;
}

/**
 * 指定した guildId が既に他チームにリンクされているか確認する。
 * 1サーバー1チーム制約の強制に使用する。
 */
export async function isGuildAlreadyLinked(guildId: string): Promise<boolean> {
  const teamId = await getTeamIdByGuildId(guildId);
  return teamId !== null;
}

