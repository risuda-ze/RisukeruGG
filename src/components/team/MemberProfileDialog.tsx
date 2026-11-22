'use client';

/** 所属者の担当分野・ひとことを編集するダイアログ（TE-014）。本人またはメンバーが使う */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { badgeVariants } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, fieldLabelClass } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';
import { updateMemberProfile } from '@/lib/repositories/teams';
import { memberProfileSchema } from '@/lib/validations/team';
import { MEMBER_DUTIES, MEMBER_DUTY_LABELS, MEMBER_NOTE_MAX } from '@/types/entities';
import type { MemberDuty, TeamMember } from '@/types/entities';

interface Props {
  teamId: string;
  member: TeamMember;
  onClose: () => void;
}

export function MemberProfileDialog({ teamId, member, onClose }: Props) {
  const [duties, setDuties] = useState<MemberDuty[]>(member.duties);
  const [note, setNote] = useState(member.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggle(d: MemberDuty) {
    setDuties((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = memberProfileSchema.safeParse({ duties, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '入力内容を確認してください');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMemberProfile(teamId, member.userId, parsed.data);
      onClose();
    } catch {
      setError('保存に失敗しました。時間をおいて再度お試しください');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${member.displayName} のプロフィールを編集`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button size="sm" form="member-profile-form" type="submit" loading={saving}>
            保存する
          </Button>
        </>
      }
    >
      <form id="member-profile-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className={cn(fieldLabelClass, 'mb-2')}>担当分野</p>
          <div className="flex flex-wrap gap-2">
            {MEMBER_DUTIES.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={duties.includes(d)}
                onClick={() => toggle(d)}
                className={cn(
                  badgeVariants({ variant: duties.includes(d) ? 'primary' : 'neutral' }),
                  'cursor-pointer'
                )}
              >
                {MEMBER_DUTY_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="ひとこと"
          value={note}
          onChange={(e) => {
            setNote(e.target.value.replace(/[\r\n]/g, ''));
            setError(null);
          }}
          maxLength={MEMBER_NOTE_MAX}
          placeholder="例: 平日夜は編集できます"
          error={error ?? undefined}
          hint={`${MEMBER_NOTE_MAX}文字以内`}
        />
      </form>
    </Modal>
  );
}
