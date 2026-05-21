'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { leaveSpecificTeam } from '@/lib/repositories/teams';

interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  isSoloOperator: boolean;   /* ソロチームのオペレーター: 退出ボタンを表示 */
  isMultiOperator: boolean;  /* 複数メンバーのオペレーター: 移譲メッセージのみ */
  onSuccess?: () => void;
}

export function LeaveTeamDialog({
  open,
  onClose,
  teamId,
  isSoloOperator,
  isMultiOperator,
  onSuccess,
}: LeaveTeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    if (isMultiOperator) return;
    setLoading(true);
    setError(null);
    try {
      await leaveSpecificTeam({ teamId });
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
      title="現在のチームから退出する"
      footer={
        isMultiOperator ? (
          <Button onClick={onClose}>閉じる</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="danger" loading={loading} onClick={handleLeave}>
              退出する
            </Button>
          </>
        )
      }
    >
      {isMultiOperator ? (
        <p className="text-sm text-live">先に所有権を移譲してください</p>
      ) : isSoloOperator ? (
        <>
          <p className="text-sm text-text">ソロチームを退出します。自動的に新しいソロチームが作成されます。</p>
          {error && <p className="mt-2 text-sm text-live">{error}</p>}
        </>
      ) : (
        <>
          <p className="text-sm text-text">チームを脱退すると、ソロチームに自動移行します。</p>
          {error && <p className="mt-2 text-sm text-live">{error}</p>}
        </>
      )}
    </Modal>
  );
}
