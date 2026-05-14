'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { joinTeam } from '@/lib/repositories/teams';

interface TeamJoinFormProps {
  onSuccess?: (teamId: string) => void;
}

export function TeamJoinForm({ onSuccess }: TeamJoinFormProps) {
  const [teamCode, setTeamCode] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamCode.trim()) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await joinTeam({ teamCode: teamCode.toUpperCase() });
      setShowConfirm(false);
      setTeamCode('');
      onSuccess?.(result.data.teamId);
    } catch (err: unknown) {
      setShowConfirm(false);
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
        title="チームに参加しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              キャンセル
            </Button>
            <Button loading={loading} onClick={handleConfirm}>
              参加する
            </Button>
          </>
        }
      >
        <p>現在のチームを脱退して、このチームに参加します。</p>
        <p className="mt-2 text-zinc-500">
          チームコード: <strong>{teamCode}</strong>
        </p>
      </Modal>
    </>
  );
}
