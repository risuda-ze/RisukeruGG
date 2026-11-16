'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DateInput } from '@/components/ui/DateInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { useBriefOps } from '@/hooks/useBriefOps';
import { createBriefInputSchema } from '@/lib/validations/briefs';
import { fromDateInputValue } from '@/lib/briefs/format';
import { trackEvent } from '@/lib/analytics';
import type { Playbook } from '@/types/briefs';
import type { TeamMember } from '@/types/entities';

interface NewBriefModalProps {
  open: boolean;
  onClose: () => void;
  playbooks: Playbook[];
  members: TeamMember[];
}

/** 新規ブリーフ作成。タイトル・公開予定日・進め方・出演者を入力して 1枚紙を生成する */
export function NewBriefModal({ open, onClose, playbooks, members }: NewBriefModalProps) {
  const router = useRouter();
  const briefOps = useBriefOps();
  const [title, setTitle] = useState('');
  const [publishAt, setPublishAt] = useState('');
  const [playbookId, setPlaybookId] = useState<string>(playbooks[0]?.id ?? '');
  const [performerIds, setPerformerIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedPlaybook = playbooks.find((p) => p.id === playbookId) ?? null;

  function togglePerformer(uid: string) {
    setPerformerIds((prev) => (prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = createBriefInputSchema.safeParse({
      title: title.trim(),
      publishAt: fromDateInputValue(publishAt),
      playbookId: playbookId || null,
      performerIds,
      linkedScheduleId: null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setSaving(true);
    try {
      const { briefId } = await briefOps.createBrief(parsed.data, selectedPlaybook);
      trackEvent('brief_create');
      onClose();
      router.push(`/briefs/${briefId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新しいブリーフ"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button type="submit" form="new-brief-form" loading={saving}>
            作成する
          </Button>
        </>
      }
    >
      <form id="new-brief-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例: 第12回 〇〇実況"
          maxLength={120}
          autoFocus
          error={error ?? undefined}
        />
        <DateInput
          label="公開予定日"
          value={publishAt}
          onChange={setPublishAt}
          hint="工程の締切はこの日から逆算されます。あとから変更できます"
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            進め方
          </span>
          {playbooks.length === 0 ? (
            <p className="text-[12px] text-text-muted">
              進め方がまだありません。工程は作成後に手で追加できます（進め方は「進め方設定」から作れます）
            </p>
          ) : (
            <Dropdown
              options={[{ value: '', label: '使わない（工程を手で追加）' }, ...playbooks.map((p) => ({ value: p.id, label: p.name }))]}
              value={playbookId}
              onChange={setPlaybookId}
            />
          )}
          {selectedPlaybook && (
            <p className="text-[11px] text-text-muted">
              {selectedPlaybook.steps.length} 工程: {selectedPlaybook.steps.map((s) => s.title).join(' → ')}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            出演者
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const on = performerIds.includes(m.userId);
              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => togglePerformer(m.userId)}
                  className={`ds-badge ${on ? 'ds-badge--primary' : 'ds-badge--neutral'} cursor-pointer`}
                  aria-pressed={on}
                >
                  {m.displayName}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
