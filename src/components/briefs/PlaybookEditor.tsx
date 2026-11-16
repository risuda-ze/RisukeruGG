'use client';

import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { playbookInputSchema, type PlaybookInput } from '@/lib/validations/briefs';
import { FIELD_TYPE_LABELS, type FieldDef, type FieldType, type Playbook, type StepDef } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';
import { badgeVariants } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';

interface PlaybookEditorProps {
  initial: Playbook | null;
  members: TeamMember[];
  onSave: (input: PlaybookInput) => Promise<void>;
  onCancel: () => void;
}

/** 表示名から工程キーを作る（英数字以外は落とし、空なら連番） */
function makeKey(title: string, index: number, taken: Set<string>): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  let key = base || `step_${index + 1}`;
  let n = 2;
  while (taken.has(key)) {
    key = `${base || 'step'}_${n}`;
    n += 1;
  }
  return key;
}

function emptyStep(index: number, taken: Set<string>): StepDef {
  return {
    key: makeKey('', index, taken),
    title: '',
    roleLabel: null,
    defaultAssigneeId: null,
    leadDays: 0,
    dependsOn: [],
    requiredFields: [],
    reminderDaysBefore: 1,
    optional: false,
  };
}

function emptyField(index: number): FieldDef {
  return { key: `field_${index + 1}`, label: '', type: 'text', required: true, ownerRoleLabel: null };
}

/**
 * 進め方の編集フォーム。工程の並び・担当・日数・先行工程・必要情報を編集する。
 * 保存時に Zod で検証し、エラーは先頭 1 件を表示する。
 */
export function PlaybookEditor({ initial, members, onSave, onCancel }: PlaybookEditorProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [steps, setSteps] = useState<StepDef[]>(initial?.steps.map((s) => ({ ...s })) ?? []);
  const [headerFields, setHeaderFields] = useState<FieldDef[]>(initial?.headerFields ?? []);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const takenKeys = () => new Set(steps.map((s) => s.key));

  function updateStep(i: number, patch: Partial<StepDef>) {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function moveStep(i: number, dir: -1 | 1) {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }
  function removeStep(i: number) {
    setSteps((prev) => {
      const removed = prev[i]!;
      return prev.filter((_, idx) => idx !== i).map((s) => ({ ...s, dependsOn: s.dependsOn.filter((k) => k !== removed.key) }));
    });
    setExpanded(null);
  }
  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length, takenKeys())]);
    setExpanded(steps.length);
  }
  function updateField(i: number, fi: number, patch: Partial<FieldDef>) {
    updateStep(i, { requiredFields: steps[i]!.requiredFields.map((f, idx) => (idx === fi ? { ...f, ...patch } : f)) });
  }

  async function handleSave() {
    // タイトルからキーを確定（未変更の自動キーを分かりやすい名前に付け替える）
    const taken = new Set<string>();
    const normalized = steps.map((s, i) => {
      const key = s.key.startsWith('step_') || !s.key ? makeKey(s.title, i, taken) : s.key;
      taken.add(key);
      return { ...s, key, title: s.title.trim() };
    });
    // キーが付け替わった場合、依存参照も追従させる
    const keyMap = new Map(steps.map((s, i) => [s.key, normalized[i]!.key]));
    const withDeps = normalized.map((s) => ({ ...s, dependsOn: s.dependsOn.map((k) => keyMap.get(k) ?? k) }));

    const parsed = playbookInputSchema.safeParse({
      name: name.trim(),
      origin: initial?.origin ?? 'manual',
      headerFields,
      steps: withDeps,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  const memberOptions = [{ value: '', label: '未定' }, ...members.map((m) => ({ value: m.userId, label: m.displayName }))];
  const typeOptions = (Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => ({ value: t, label: FIELD_TYPE_LABELS[t] }));

  return (
    <div className="space-y-5">
      <Input label="進め方の名前" value={name} onChange={(e) => setName(e.target.value)} placeholder="例: YouTube 動画（編集あり）" maxLength={60} />

      {/* 工程 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">工程（上から順に）</h4>
          <Button size="sm" variant="secondary" onClick={addStep}>
            <Icon name="add" size={14} />
            工程を追加
          </Button>
        </div>
        {steps.length === 0 && <p className="text-[12px] text-text-muted">工程がありません。「工程を追加」から始めてください</p>}
        <ul className="space-y-2">
          {steps.map((s, i) => {
            const open = expanded === i;
            const assignee = members.find((m) => m.userId === s.defaultAssigneeId);
            return (
              <li key={i} className="rounded-[12px] border border-border" style={{ background: 'var(--canvas)' }}>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="text-[11px] text-text-muted w-5 text-right tabular-nums">{i + 1}</span>
                  <input
                    value={s.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    placeholder="工程名（例: サムネ作成）"
                    className="flex-1 min-w-0 bg-transparent text-sm text-text outline-none"
                    maxLength={60}
                  />
                  <span className="hidden sm:inline text-[11px] text-text-muted truncate max-w-[160px]">
                    {assignee?.displayName ?? '担当未定'} / 公開 {s.leadDays} 日前
                  </span>
                  <button type="button" onClick={() => moveStep(i, -1)} aria-label="上へ" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })} disabled={i === 0}>
                    <Icon name="keyboard_arrow_up" size={16} />
                  </button>
                  <button type="button" onClick={() => moveStep(i, 1)} aria-label="下へ" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })} disabled={i === steps.length - 1}>
                    <Icon name="keyboard_arrow_down" size={16} />
                  </button>
                  <button type="button" onClick={() => setExpanded(open ? null : i)} aria-label="詳細" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })}>
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={16} />
                  </button>
                </div>
                {open && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>既定の担当</span>
                        <Dropdown options={memberOptions} value={s.defaultAssigneeId ?? ''} onChange={(v) => updateStep(i, { defaultAssigneeId: v || null })} size="sm" />
                      </div>
                      <Input label="役割（例: 編集）" value={s.roleLabel ?? ''} onChange={(e) => updateStep(i, { roleLabel: e.target.value || null })} maxLength={20} />
                      <Input label="公開の何日前まで" type="number" inputMode="numeric" min={0} max={365} value={String(s.leadDays)} onChange={(e) => updateStep(i, { leadDays: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="締切の何日前に知らせる" type="number" inputMode="numeric" min={0} max={30} value={String(s.reminderDaysBefore)} onChange={(e) => updateStep(i, { reminderDaysBefore: Number(e.target.value) || 0 })} />
                      <label className="flex items-center gap-2 text-sm text-text-2 sm:mt-7">
                        <input type="checkbox" checked={s.optional} onChange={(e) => updateStep(i, { optional: e.target.checked })} />
                        飛ばせる工程
                      </label>
                    </div>
                    {/* 先行工程 */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>先行工程（終わってから着手）</span>
                      <div className="flex flex-wrap gap-2">
                        {steps.filter((_, idx) => idx !== i).map((other) => {
                          const on = s.dependsOn.includes(other.key);
                          return (
                            <button
                              key={other.key}
                              type="button"
                              onClick={() => updateStep(i, { dependsOn: on ? s.dependsOn.filter((k) => k !== other.key) : [...s.dependsOn, other.key] })}
                              className={cn(badgeVariants({ variant: on ? 'primary' : 'neutral' }), 'cursor-pointer')}
                              aria-pressed={on}
                            >
                              {other.title || '（無題）'}
                            </button>
                          );
                        })}
                        {steps.length <= 1 && <span className="text-[12px] text-text-muted">他の工程がありません</span>}
                      </div>
                    </div>
                    {/* 必要な情報 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>この工程に必要な情報</span>
                        <Button size="sm" variant="subtle" onClick={() => updateStep(i, { requiredFields: [...s.requiredFields, emptyField(s.requiredFields.length)] })}>
                          <Icon name="add" size={14} />
                          項目
                        </Button>
                      </div>
                      {s.requiredFields.map((f, fi) => (
                        <div key={fi} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                          <Input label={fi === 0 ? '項目名' : ''} value={f.label} onChange={(e) => updateField(i, fi, { label: e.target.value })} placeholder="例: 素材の場所" maxLength={40} />
                          <div className="flex flex-col gap-1.5">
                            {fi === 0 && <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>型</span>}
                            <Dropdown options={typeOptions} value={f.type} onChange={(v) => updateField(i, fi, { type: v as FieldType })} size="sm" />
                          </div>
                          <Input label={fi === 0 ? '入力する人' : ''} value={f.ownerRoleLabel ?? ''} onChange={(e) => updateField(i, fi, { ownerRoleLabel: e.target.value || null })} placeholder="役割" maxLength={20} className="w-24" />
                          <button type="button" onClick={() => updateStep(i, { requiredFields: s.requiredFields.filter((_, idx) => idx !== fi) })} aria-label="項目を削除" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })}>
                            <Icon name="delete_outline" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <button type="button" onClick={() => removeStep(i)} className="text-[12px] text-text-muted hover:text-live transition-colors">
                        この工程を削除
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* 見出し項目 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-semibold text-text-muted uppercase tracking-wide">見出しに置く項目</h4>
          <Button size="sm" variant="subtle" onClick={() => setHeaderFields((prev) => [...prev, { ...emptyField(prev.length), required: false }])}>
            <Icon name="add" size={14} />
            項目
          </Button>
        </div>
        {headerFields.length === 0 && <p className="text-[12px] text-text-muted">例: 概要、素材リンク。見出しに入力欄として並びます</p>}
        {headerFields.map((f, fi) => (
          <div key={fi} className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
            <Input label={fi === 0 ? '項目名' : ''} value={f.label} onChange={(e) => setHeaderFields((prev) => prev.map((x, idx) => (idx === fi ? { ...x, label: e.target.value } : x)))} maxLength={40} />
            <div className="flex flex-col gap-1.5">
              {fi === 0 && <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>型</span>}
              <Dropdown options={typeOptions} value={f.type} onChange={(v) => setHeaderFields((prev) => prev.map((x, idx) => (idx === fi ? { ...x, type: v as FieldType } : x)))} size="sm" />
            </div>
            <button type="button" onClick={() => setHeaderFields((prev) => prev.filter((_, idx) => idx !== fi))} aria-label="項目を削除" className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })}>
              <Icon name="delete_outline" size={16} />
            </button>
          </div>
        ))}
      </section>

      {error && <p className="text-[12px] text-live">{error}</p>}
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          キャンセル
        </Button>
        <Button onClick={handleSave} loading={saving}>
          {initial ? '保存する（版を上げる）' : '作成する'}
        </Button>
      </div>
    </div>
  );
}
