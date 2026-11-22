import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp, type Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { AiPreset, TeamAiSettings } from '@/types/entities';
import type { TeamAiSettingsInput } from '@/lib/validations/ai';

/** 未設定時の既定値 */
export const EMPTY_AI_SETTINGS: TeamAiSettings = { teamInstructions: '', presets: [], updatedAt: null };

function toAiSettings(data: Record<string, unknown> | undefined): TeamAiSettings {
  if (!data) return EMPTY_AI_SETTINGS;
  const rawPresets = Array.isArray(data.presets) ? (data.presets as Array<Record<string, unknown>>) : [];
  const presets: AiPreset[] = rawPresets
    .filter((p) => typeof p.id === 'string' && typeof p.name === 'string' && typeof p.body === 'string')
    .map((p) => ({ id: p.id as string, name: p.name as string, body: p.body as string }));
  return {
    teamInstructions: typeof data.teamInstructions === 'string' ? data.teamInstructions : '',
    presets,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : null,
  };
}

const settingsDoc = (teamId: string) => doc(db, 'teams', teamId, 'ai', 'settings');

/** teams/{teamId}/ai/settings を購読する（未作成なら既定値） */
export function subscribeTeamAiSettings(teamId: string, callback: (settings: TeamAiSettings) => void): Unsubscribe {
  return onSnapshot(settingsDoc(teamId), (snap) => {
    callback(toAiSettings(snap.exists() ? (snap.data() as Record<string, unknown>) : undefined));
  });
}

/** メンバーが保存する（Firestore ルールで強制） */
export async function saveTeamAiSettings(teamId: string, input: TeamAiSettingsInput): Promise<void> {
  await setDoc(
    settingsDoc(teamId),
    { teamInstructions: input.teamInstructions, presets: input.presets, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
