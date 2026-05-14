'use client';

import { useState } from 'react';
import { updateMemberRole } from '@/lib/repositories/teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { TeamMember, UserRole } from '@/types/entities';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

interface RoleChangeDialogProps {
  teamId: string;
  member: TeamMember;
  newRole: 'editor' | 'viewer';
  onClose: () => void;
  onSuccess: () => void;
}

export function RoleChangeDialog({
  teamId,
  member,
  newRole,
  onClose,
  onSuccess,
}: RoleChangeDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
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
          <Button variant="secondary" onClick={onClose}>キャンセル</Button>
          <Button loading={saving} onClick={handleConfirm}>変更する</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-text">
        <p>
          <span className="font-medium">{member.displayName}</span> のロールを{' '}
          <span className="font-medium">{ROLE_LABELS[newRole]}</span> に変更しますか？
        </p>
        {newRole === 'viewer' && (
          <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
            Viewerになると、スケジュール・タスクの作成・編集ができなくなります。
          </p>
        )}
        {error && <p className="text-live">{error}</p>}
      </div>
    </Modal>
  );
}
