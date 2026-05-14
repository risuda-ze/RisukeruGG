'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { leaveTeam } from '@/lib/repositories/teams';

interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  isOwner: boolean;
  onSuccess?: () => void;
}

export function LeaveTeamDialog({ open, onClose, isOwner, onSuccess }: LeaveTeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    if (isOwner) return;
    setLoading(true);
    setError(null);
    try {
      await leaveTeam();
      onClose();
      onSuccess?.();
    } catch {
      setError('チームの脱退に失敗しました。もう一度お試しください');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="チームを脱退する"
      footer={
        isOwner ? (
          <Button onClick={onClose}>閉じる</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="danger" loading={loading} onClick={handleLeave}>
              脱退する
            </Button>
          </>
        )
      }
    >
      {isOwner ? (
        <p className="text-sm text-live">先に所有権を移譲してください</p>
      ) : (
        <>
          <p className="text-sm text-text">チームを脱退すると、ソロチームに自動移行します。</p>
          {error && <p className="mt-2 text-sm text-live">{error}</p>}
        </>
      )}
    </Modal>
  );
}
