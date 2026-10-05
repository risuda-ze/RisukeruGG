'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { useBriefOps } from '@/hooks/useBriefOps';
import { addStepInputSchema } from '@/lib/validations/briefs';
import type { Step } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface AddStepModalProps {
  open: boolean;
  onClose: () => void;
  briefId: string;
  steps: Step[];
  members: TeamMember[];
}

/** 工程の手追加。締切は公開予定日から逆算する */
export function AddStepModal({ open, onClose, briefId, steps, members }: AddStepModalProps) {
  const briefOps = useBriefOps();
  const [title, setTitle] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [leadDays, setLeadDays] = useState('0');
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [optional, setOptional] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleDep(key: string) {
    setDependsOn((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = addStepInputSchema.safeParse({
      title: title.trim(),
      assigneeId: assigneeId || null,
      leadDays: Number(leadDays),
      dependsOn,
      requiredFields: [],
      optional,
      afterStepId: null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await briefOps.addStep(briefId, parsed.data);
      setTitle('');
      setDependsOn([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '追加に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="工程を追加"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button type="submit" form="add-step-form" loading={saving}>
            追加する
          </Button>
        </>
      }
    >
      <form id="add-step-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="工程名" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} autoFocus error={error ?? undefined} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>担当</span>
            <Dropdown
              options={[{ value: '', label: '未定' }, ...members.map((m) => ({ value: m.userId, label: m.displayName }))]}
              value={assigneeId}
              onChange={setAssigneeId}
              size="sm"
            />
          </div>
          <Input
            label="公開の何日前まで"
            type="number"
            inputMode="numeric"
            min={0}
            max={365}
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
          />
        </div>
        {steps.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>先行工程（終わってから着手）</span>
            <div className="flex flex-wrap gap-2">
              {steps.map((s) => {
                const on = dependsOn.includes(s.key);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleDep(s.key)}
                    className={`ds-badge ${on ? 'ds-badge--primary' : 'ds-badge--neutral'} cursor-pointer`}
                    aria-pressed={on}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-text-2">
          <input type="checkbox" checked={optional} onChange={(e) => setOptional(e.target.checked)} />
          飛ばせる工程にする
        </label>
      </form>
    </Modal>
  );
}
