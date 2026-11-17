'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { joinTeam, leaveSpecificTeam } from '@/lib/repositories/teams';
import { useAuthStore } from '@/stores/auth';

interface TeamJoinFormProps {
  onSuccess?: (teamId: string) => void;
}

export function TeamJoinForm({ onSuccess }: TeamJoinFormProps) {
  const [teamCode, setTeamCode] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const teamIds = useAuthStore((s) => s.teamIds);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) return;
    if (currentTeamId && teamIds.length > 0) {
      setShowConfirm(true);
    } else {
      void handleJoin(false);
    }
  };

  const handleJoin = async (leaveFirst: boolean) => {
    setLoading(true);
    setError(null);
    setShowConfirm(false);
    try {
      if (leaveFirst && currentTeamId) {
        await leaveSpecificTeam({ teamId: currentTeamId });
      }
      const result = await joinTeam({ teamCode: teamCode.toUpperCase() });
      setTeamCode('');
      onSuccess?.(result.data.teamId);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const code = (err as { code: string }).code;
        if (code === 'not-found') {
          setError('無効なチームコードです');
        } else if (code === 'failed-precondition') {
          setError('全員がPARTYプランにアップグレードする必要があります');
        } else {
          setError('チームへの参加に失敗しました。もう一度お試しください');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="チームコード"
          value={teamCode}
          onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
          placeholder="英数字8文字"
          maxLength={20}
          pattern="[A-Z0-9]+"
          error={error ?? undefined}
          aria-label="チームコードを入力"
        />
        <Button type="submit" disabled={!teamCode.trim()}>
          チームに参加する
        </Button>
      </form>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="現在のチームに所属したままにしますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              キャンセル
            </Button>
            <Button
              variant="secondary"
              loading={loading}
              onClick={() => void handleJoin(false)}
            >
              はい（そのまま参加）
            </Button>
            <Button loading={loading} onClick={() => void handleJoin(true)}>
              いいえ（脱退して参加）
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          チームコード <strong>{teamCode}</strong> のチームに参加します。
        </p>
        <p className="mt-2 text-sm text-text-muted">
          現在のチームに引き続き所属するか、脱退してから参加するかを選択してください。
        </p>
      </Modal>
    </>
  );
}
