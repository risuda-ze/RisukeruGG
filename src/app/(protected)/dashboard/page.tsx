'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createTeam } from '@/lib/repositories/teams';

export default function DashboardPage() {
  const { currentUser, currentTeam, members, loading } = useAuthStore();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isSoloTeam = members.length <= 1;

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({ name: teamName.trim() });
      setShowCreateTeam(false);
      setTeamName('');
    } catch {
      setCreateError('チームの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* チーム情報 */}
      {currentTeam && (
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">{currentTeam.name}</h2>
            <div className="flex items-center gap-2">
              {myMember && (
                <Badge variant={myMember.role === 'owner' ? 'info' : 'default'}>
                  {myMember.role === 'owner' ? 'Owner' : myMember.role === 'editor' ? 'Editor' : 'Viewer'}
                </Badge>
              )}
              <Badge variant={myMember?.plan === 'party' ? 'purple' : 'default'}>
                {myMember?.plan === 'party' ? 'PARTY' : 'LIGHT'}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-zinc-500">メンバー {members.length}名</p>
        </div>
      )}

      {/* ソロチームユーザー向けオンボーディングUI */}
      {isSoloTeam && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="mb-2 text-base font-semibold text-zinc-900">チームに参加または作成する</h3>
          <p className="mb-6 text-sm text-zinc-500">
            チームメンバーとスケジュールを共有できます
          </p>

          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-zinc-700">チームコードで参加する</p>
            <TeamJoinForm />
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <p className="mb-3 text-sm font-medium text-zinc-700">新しいチームを作成する</p>
            <Button variant="secondary" onClick={() => setShowCreateTeam(true)}>
              チームを作成する
            </Button>
          </div>
        </div>
      )}

      {/* チーム作成モーダル */}
      <Modal
        open={showCreateTeam}
        onClose={() => setShowCreateTeam(false)}
        title="チームを作成する"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateTeam(false)}>
              キャンセル
            </Button>
            <Button loading={creating} onClick={handleCreateTeam}>
              作成する
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTeam}>
          <Input
            label="チーム名"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="例: 配信チーム"
            maxLength={50}
            error={createError ?? undefined}
          />
        </form>
      </Modal>
    </div>
  );
}
