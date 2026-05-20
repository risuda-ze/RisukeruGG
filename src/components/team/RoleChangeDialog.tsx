'use client';

import { useState } from 'react';
import { updateMemberRole } from '@/lib/repositories/teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { TeamMember, UserRole } from '@/types/entities';

const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  rom: 'ROM専',
};

interface RoleChangeDialogProps {
  teamId: string;
  member: TeamMember;
  newRole: 'member' | 'rom' | 'operator';
  /** オペレーターへ昇格する際に降格させる現在のオペレーターID */
  currentOperatorId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleChangeDialog({
  teamId,
  member,
  newRole,
  currentOperatorId,
  onClose,
  onSuccess,
}: RoleChangeDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      // オペレーターへ昇格する場合は現在のオペレーターをメンバーに降格してから昇格する
      if (newRole === 'operator' && currentOperatorId) {
        await updateMemberRole(teamId, currentOperatorId, 'member');
      }
      await updateMemberRole(teamId, member.userId, newRole);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロールの変更に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="ロールを変更"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button loading={saving} onClick={handleConfirm}>
            変更する
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-text">
        <p>
          <span className="font-medium">{member.displayName}</span> のロールを{' '}
          <span className="font-medium">{ROLE_LABELS[newRole]}</span> に変更しますか？
        </p>
        {newRole === 'operator' && (
          <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
            オペレーターに昇格すると、現在のオペレーターはメンバーに降格されます。
          </p>
        )}
        {newRole === 'rom' && (
          <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
            ROM専になると、スケジュール・タスクの作成・編集ができなくなります。
          </p>
        )}
        {error && <p className="text-live">{error}</p>}
      </div>
    </Modal>
  );
}
