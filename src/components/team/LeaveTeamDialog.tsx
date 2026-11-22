'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { leaveSpecificTeam } from '@/lib/repositories/teams';

interface LeaveTeamDialogProps {
  open: boolean;
  onClose: () => void;
  teamId: string;
  isSoloMember: boolean;   /* ソロチームのメンバー: 退出ボタンを表示 */
  isMultiMember: boolean;  /* 複数の所属者がいるチームのメンバー: 移譲メッセージのみ */
  onSuccess?: () => void;
}

export function LeaveTeamDialog({
  open,
  onClose,
  teamId,
  isSoloMember,
  isMultiMember,
  onSuccess,
}: LeaveTeamDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLeave = async () => {
    if (isMultiMember) return;
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
        isMultiMember ? (
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
      {isMultiMember ? (
        <p className="text-sm text-live">先に別の所属者をメンバーに変更してください</p>
      ) : isSoloMember ? (
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
