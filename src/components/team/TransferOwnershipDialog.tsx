'use client';

import { useState } from 'react';
import { transferOwnership } from '@/lib/repositories/teams';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { TeamMember } from '@/types/entities';

interface TransferOwnershipDialogProps {
  teamId: string;
  members: TeamMember[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferOwnershipDialog({
  teamId,
  members,
  onClose,
  onSuccess,
}: TransferOwnershipDialogProps) {
  const candidates = members.filter((m) => m.role !== 'owner');
  const [selectedUserId, setSelectedUserId] = useState(candidates[0]?.userId ?? '');
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleConfirm() {
    if (!selectedUserId) return;
    setTransferring(true);
    setError(null);
    try {
      await transferOwnership({ teamId, newOwnerId: selectedUserId });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '所有権の移譲に失敗しました');
    } finally {
      setTransferring(false);
    }
  }

  const selectedMember = members.find((m) => m.userId === selectedUserId);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="所有権を移譲"
      footer={
        done ? (
          <Button onClick={onSuccess}>閉じる</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button loading={transferring} onClick={handleConfirm} disabled={!selectedUserId}>
              移譲する
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="text-sm text-text">
          <p>所有権を移譲しました。あなたのロールはEditorになりました。</p>
        </div>
      ) : (
        <div className="space-y-4 text-sm text-text">
          <p>移譲先のメンバーを選択してください。選択後、あなたのロールはEditorになります。</p>
          {candidates.length === 0 ? (
            <p className="text-muted">移譲先のメンバーがいません</p>
          ) : (
            <div>
              <label className="block text-sm font-medium text-text mb-1">移譲先</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-border rounded-[8px] px-3 py-2 text-sm bg-surface text-text focus:outline-none focus:ring-2 focus:ring-purple"
              >
                {candidates.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.displayName} ({m.role === 'editor' ? 'Editor' : 'Viewer'})
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedMember && (
            <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
              {selectedMember.displayName} に所有権を移譲します。この操作は元に戻せません。
            </p>
          )}
          {error && <p className="text-live">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
