'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RoleChangeDialog } from '@/components/team/RoleChangeDialog';
import { RemoveMemberDialog } from '@/components/team/RemoveMemberDialog';
import { TransferOwnershipDialog } from '@/components/team/TransferOwnershipDialog';
import type { TeamMember, UserRole } from '@/types/entities';

type DialogState =
  | { type: 'roleChange'; member: TeamMember; newRole: 'editor' | 'viewer' }
  | { type: 'remove'; member: TeamMember }
  | { type: 'transfer' }
  | null;

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

export default function TeamPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks } = useTasksStore();
  const [dialog, setDialog] = useState<DialogState>(null);

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

  if (!teamId) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        チームに参加してください
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">チームメンバー</h1>
        {isOwner && (
          <Button variant="secondary" onClick={() => setDialog({ type: 'transfer' })}>
            所有権を移譲
          </Button>
        )}
      </div>

      {currentTeam && (
        <p className="text-sm text-zinc-500 mb-6">
          チームコード: <span className="font-mono font-medium text-zinc-700">{currentTeam.teamCode}</span>
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {members.map((member) => (
          <div key={member.userId} className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-zinc-200 flex-shrink-0 overflow-hidden">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                  {member.displayName[0]}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 truncate">
                  {member.displayName}
                  {member.userId === currentUser?.uid && (
                    <span className="text-zinc-400 ml-1">（あなた）</span>
                  )}
                </span>
              </div>
              <div className="flex gap-1 mt-0.5">
                <Badge variant={member.role === 'owner' ? 'info' : 'default'}>
                  {ROLE_LABELS[member.role]}
                </Badge>
                <Badge variant={member.plan === 'party' ? 'purple' : 'default'}>
                  {member.plan === 'party' ? 'PARTY' : 'LIGHT'}
                </Badge>
              </div>
            </div>

            {isOwner && member.userId !== currentUser?.uid && member.role !== 'owner' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member, e.target.value)}
                  className="text-sm border border-zinc-200 rounded px-2 py-1 bg-white"
                  aria-label="ロールを変更"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={() => setDialog({ type: 'remove', member })}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                  aria-label="メンバーを削除"
                >
                  削除
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

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
    </div>
  );
}
