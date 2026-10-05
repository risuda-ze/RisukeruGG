import { getAdminFirestore } from '@/lib/firebase/admin';

/** Discord のオートコンプリート候補（最大 25 件） */
export interface AutocompleteChoice {
  name: string;
  value: string;
}

/**
 * /risukerugg の preset オプションのオートコンプリート（AI-023 / IN-030）。
 * guildId → チームを解決し、AI 設定の定型指示を候補として返す。
 * 3 秒制限内に返す必要があるため Firestore 読み取りは 2 回に抑える。
 */
export async function buildPresetChoices(guildId: string, query: string): Promise<AutocompleteChoice[]> {
  const db = getAdminFirestore();
  const configSnap = await db.collectionGroup('discord').where('guildId', '==', guildId).limit(1).get();
  const teamId = configSnap.docs[0]?.ref.parent.parent?.id;
  if (!teamId) return [];

  const settingsSnap = await db.doc(`teams/${teamId}/ai/settings`).get();
  const presets = (settingsSnap.data()?.presets as Array<{ id: string; name: string }> | undefined) ?? [];
  const q = query.trim().toLowerCase();
  return presets
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .slice(0, 25)
    .map((p) => ({ name: p.name.slice(0, 100), value: p.id }));
}

/** preset の ID から本文を解決する（handleRisukerugg 用） */
export async function resolvePresetBody(teamId: string, presetId: string): Promise<string | null> {
  const db = getAdminFirestore();
  const snap = await db.doc(`teams/${teamId}/ai/settings`).get();
  const presets = (snap.data()?.presets as Array<{ id: string; body: string }> | undefined) ?? [];
  return presets.find((p) => p.id === presetId)?.body ?? null;
}
