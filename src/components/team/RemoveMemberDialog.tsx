'use client';

import { useState } from 'react';
import { removeTeamMember } from '@/lib/repositories/teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { TeamMember } from '@/types/entities';

interface RemoveMemberDialogProps {
  teamId: string;
  member: TeamMember;
  pendingTaskCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  teamId,
  member,
  pendingTaskCount,
  onClose,
  onSuccess,
}: RemoveMemberDialogProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setRemoving(true);
    setError(null);
    try {
      await removeTeamMember({ teamId, targetUserId: member.userId });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メンバーの削除に失敗しました');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="メンバーを削除"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="danger" loading={removing} onClick={handleConfirm}>
            削除する
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-text">
        <p>
          <span className="font-medium">{member.displayName}</span> をチームから削除しますか？
        </p>
        {pendingTaskCount > 0 && (
          <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
            このメンバーが担当する未完タスクが {pendingTaskCount} 件あります。
            削除後、これらのタスクは担当者なし（未アサイン）になります。
          </p>
        )}
        <p className="text-text-muted">削除後、このメンバーはソロチームへ移動されます。</p>
        {error && <p className="text-live">{error}</p>}
      </div>
    </Modal>
  );
}
