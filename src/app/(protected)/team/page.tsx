'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { RoleChangeDialog } from '@/components/team/RoleChangeDialog';
import { RemoveMemberDialog } from '@/components/team/RemoveMemberDialog';
import { TransferOwnershipDialog } from '@/components/team/TransferOwnershipDialog';
import { LeaveTeamDialog } from '@/components/team/LeaveTeamDialog';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import type { TeamMember, UserRole } from '@/types/entities';

type DialogState =
  | { type: 'roleChange'; member: TeamMember; newRole: 'editor' | 'viewer' }
  | { type: 'remove'; member: TeamMember }
  | { type: 'transfer' }
  | { type: 'leave' }
  | null;

const ROLE_LABELS: Record<UserRole, string> = {
  owner:  'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

type BadgeVariant = 'purple' | 'amber' | 'muted' | 'green' | 'live' | 'default';
const ROLE_BADGE: Record<UserRole, BadgeVariant> = {
  owner:  'purple',
  editor: 'amber',
  viewer: 'muted',
};

export default function TeamPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks } = useTasksStore();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [copied, setCopied] = useState(false);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwner = myMember?.role === 'owner';

  function getPendingTaskCount(userId: string): number {
    return tasks.filter((t) => t.assigneeId === userId).length;
  }

  function handleRoleChange(member: TeamMember, value: string) {
    if (value === 'editor' || value === 'viewer') {
      setDialog({ type: 'roleChange', member, newRole: value });
    }
  }

  async function copyTeamCode() {
    if (!currentTeam?.teamCode) return;
    await navigator.clipboard.writeText(currentTeam.teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!teamId) {
    return (
      <div className="px-4 py-6 md:px-7 max-w-lg">
        <h2 className="text-base font-semibold text-text mb-5">チーム管理</h2>
        <Card>
          <p className="text-sm text-muted mb-4">チームに参加してください</p>
          <TeamJoinForm />
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-7 max-w-2xl space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-text">チーム管理</h2>
        {isOwner && (
          <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'transfer' })}>
            所有権を移譲
          </Button>
        )}
      </div>

      {/* ── チーム情報カード ─────────────────────────────── */}
      {currentTeam && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-muted uppercase tracking-wide mb-0.5">チーム名</p>
              <p className="text-base font-semibold text-text">{currentTeam.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted uppercase tracking-wide mb-0.5">チームコード</p>
              <p className="text-base font-mono font-bold text-purple-l tracking-widest">
                {currentTeam.teamCode}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={copyTeamCode} aria-label="チームコードをコピー">
              {copied ? '✓ コピー済み' : 'コピー'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── メンバーリスト ───────────────────────────────── */}
      <Card noPadding>
        <CardHeader title={`メンバー (${members.length}名)`} />
        <div className="divide-y divide-border">
          {members.map((member) => (
            <div key={member.userId} className="flex items-center gap-3 px-[18px] py-3">
              <Avatar
                initials={member.displayName.slice(0, 2)}
                bgClass="bg-purple-d/30"
                textClass="text-purple-l"
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-text truncate">
                  {member.displayName}
                  {member.userId === currentUser?.uid && (
                    <span className="text-muted ml-1 text-[11px]">（あなた）</span>
                  )}
                </p>
                <div className="flex gap-1 mt-0.5">
                  <Badge variant={ROLE_BADGE[member.role]}>{ROLE_LABELS[member.role]}</Badge>
                  <Badge variant={member.plan === 'party' ? 'purple' : 'muted'}>
                    {member.plan === 'party' ? 'PARTY' : 'LIGHT'}
                  </Badge>
                </div>
              </div>

              {/* オーナー専用アクション */}
              {isOwner && member.userId !== currentUser?.uid && member.role !== 'owner' && (
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member, e.target.value)}
                    className="text-xs border border-border rounded-[6px] px-2 py-1 bg-card text-text"
                    aria-label="ロールを変更"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    onClick={() => setDialog({ type: 'remove', member })}
                    className="text-[11px] text-muted hover:text-live transition-colors px-1.5 py-1 rounded-[4px] hover:bg-live/10"
                    aria-label="メンバーを削除"
                  >
                    削除
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── チームコードで参加 ───────────────────────────── */}
      <Card>
        <p className="text-[11px] text-muted uppercase tracking-wide mb-3">チームコードで参加</p>
        <TeamJoinForm />
      </Card>

      {/* ── 危険ゾーン ───────────────────────────────────── */}
      <Card className="border-live/20">
        <p className="text-[11px] text-muted uppercase tracking-wide mb-3">退出</p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => setDialog({ type: 'leave' })}
        >
          チームを脱退する
        </Button>
      </Card>

      {/* ── ダイアログ ───────────────────────────────────── */}
      {dialog?.type === 'roleChange' && teamId && (
        <RoleChangeDialog
          teamId={teamId}
          member={dialog.member}
          newRole={dialog.newRole}
          onClose={() => setDialog(null)}
          onSuccess={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'remove' && teamId && (
        <RemoveMemberDialog
          teamId={teamId}
          member={dialog.member}
          pendingTaskCount={getPendingTaskCount(dialog.member.userId)}
          onClose={() => setDialog(null)}
          onSuccess={() => setDialog(null)}
        />
      )}
      {dialog?.type === 'transfer' && teamId && (
        <TransferOwnershipDialog
          teamId={teamId}
          members={members}
          onClose={() => setDialog(null)}
          onSuccess={() => setDialog(null)}
        />
      )}
      <LeaveTeamDialog
        open={dialog?.type === 'leave'}
        onClose={() => setDialog(null)}
        isOwner={isOwner}
      />
    </div>
  );
}
