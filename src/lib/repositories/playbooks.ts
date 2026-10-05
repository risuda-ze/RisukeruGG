import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { FieldDef, Playbook, PlaybookOrigin, StepDef } from '@/types/briefs';
import type { PlaybookInput } from '@/lib/validations/briefs';

function toDate(v: unknown): Date {
  return v instanceof Timestamp ? v.toDate() : new Date(0);
}

function toFieldDefs(v: unknown): FieldDef[] {
  if (!Array.isArray(v)) return [];
  return v.map((f) => ({
    key: String(f.key),
    label: String(f.label ?? f.key),
    type: (f.type as FieldDef['type']) ?? 'text',
    options: Array.isArray(f.options) ? (f.options as string[]) : undefined,
    required: Boolean(f.required),
    ownerRoleLabel: (f.ownerRoleLabel as string | null | undefined) ?? null,
  }));
}

function toStepDefs(v: unknown): StepDef[] {
  if (!Array.isArray(v)) return [];
  return v.map((s) => ({
    key: String(s.key),
    title: String(s.title),
    roleLabel: (s.roleLabel as string | null | undefined) ?? null,
    defaultAssigneeId: (s.defaultAssigneeId as string | null | undefined) ?? null,
    leadDays: (s.leadDays as number | undefined) ?? 0,
    dependsOn: (s.dependsOn as string[] | undefined) ?? [],
    requiredFields: toFieldDefs(s.requiredFields),
    reminderDaysBefore: (s.reminderDaysBefore as number | undefined) ?? 1,
    optional: Boolean(s.optional),
  }));
}

function toPlaybook(id: string, data: Record<string, unknown>): Playbook {
  return {
    id,
    name: data.name as string,
    version: (data.version as number | undefined) ?? 1,
    origin: (data.origin as PlaybookOrigin | undefined) ?? 'manual',
    headerFields: toFieldDefs(data.headerFields),
    steps: toStepDefs(data.steps),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Firestore は undefined を拒否するため、FieldDef.options の undefined を落とす */
function serializeFieldDefs(fields: FieldDef[]) {
  return fields.map(({ options, ...rest }) => (options ? { ...rest, options } : rest));
}

function serializeSteps(steps: StepDef[]) {
  return steps.map((s) => ({ ...s, requiredFields: serializeFieldDefs(s.requiredFields) }));
}

const playbooksCol = (teamId: string) => collection(db, 'teams', teamId, 'playbooks');

export function subscribePlaybooks(teamId: string, callback: (playbooks: Playbook[]) => void): Unsubscribe {
  const q = query(playbooksCol(teamId), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => toPlaybook(d.id, d.data() as Record<string, unknown>)));
  });
}

export async function createPlaybook(teamId: string, input: PlaybookInput): Promise<string> {
  const ref = await addDoc(playbooksCol(teamId), {
    name: input.name,
    origin: input.origin,
    version: 1,
    headerFields: serializeFieldDefs(input.headerFields),
    steps: serializeSteps(input.steps),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** 更新のたびに version を +1 する（ブリーフ側は生成時の版を保持する） */
export async function updatePlaybook(
  teamId: string,
  playbookId: string,
  input: Pick<PlaybookInput, 'name' | 'headerFields' | 'steps'>
): Promise<void> {
  await updateDoc(doc(playbooksCol(teamId), playbookId), {
    name: input.name,
    headerFields: serializeFieldDefs(input.headerFields),
    steps: serializeSteps(input.steps),
    version: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePlaybook(teamId: string, playbookId: string): Promise<void> {
  await deleteDoc(doc(playbooksCol(teamId), playbookId));
}
