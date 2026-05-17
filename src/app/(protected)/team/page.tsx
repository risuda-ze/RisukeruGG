'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth';
import { TopBar } from '@/components/layout/TopBar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RoleChangeDialog } from '@/components/team/RoleChangeDialog';
import { RemoveMemberDialog } from '@/components/team/RemoveMemberDialog';
import { TransferOwnershipDialog } from '@/components/team/TransferOwnershipDialog';
import { LeaveTeamDialog } from '@/components/team/LeaveTeamDialog';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import { createTeam, dissolveTeam } from '@/lib/repositories/teams';
import type { TeamMember, UserRole } from '@/types/entities';

type DialogState =
  | { type: 'roleChange'; member: TeamMember; newRole: 'editor' | 'viewer' }
  | { type: 'remove'; member: TeamMember }
  | { type: 'transfer' }
  | { type: 'leave' }
  | null;

const ROLE_LABELS: Record<UserRole, string> = {
  owner: '配信者 / オーナー',
  editor: 'Editor',
  viewer: 'Viewer',
};

/* ロール別バッジ色 */
const ROLE_BADGE: Record<UserRole, { bg: string; text: string; border: string }> = {
  owner: {
    bg: 'var(--purple-sm)',
    text: 'var(--purple-l)',
    border: 'var(--purple)',
  },
  editor: {
    bg: 'rgba(239,159,39,0.15)',
    text: 'var(--amber-l)',
    border: 'var(--amber)',
  },
  viewer: {
    bg: 'rgba(102,102,170,0.15)',
    text: 'var(--muted-l)',
    border: 'var(--border-l)',
  },
};

/* アバター背景色 */
const AVATAR_PALETTES = [
  { bg: 'var(--purple-d)', text: 'var(--purple-l)' },
  { bg: 'rgba(74,222,128,0.2)', text: '#4ade80' },
  { bg: 'rgba(239,159,39,0.2)', text: 'var(--amber-l)' },
  { bg: 'rgba(127,119,221,0.2)', text: 'var(--purple-l)' },
];

export default function TeamPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [showEditName, setShowEditName] = useState(false);
  const [editNameValue, setEditNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editNameError, setEditNameError] = useState<string | null>(null);
  const [showDissolve, setShowDissolve] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [dissolveError, setDissolveError] = useState<string | null>(null);
  const [dissolveConfirmName, setDissolveConfirmName] = useState('');

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwner = myMember?.role === 'owner';
  const isSolo = members.length <= 1 && !teamId;

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!editNameValue.trim() || !teamId) return;
    setSavingName(true);
    setEditNameError(null);
    try {
      await updateDoc(doc(db, 'teams', teamId), { name: editNameValue.trim() });
      setShowEditName(false);
    } catch {
      setEditNameError('チーム名の更新に失敗しました');
    } finally {
      setSavingName(false);
    }
  }

  function openDissolveModal() {
    setDissolveConfirmName('');
    setDissolveError(null);
    setShowDissolve(true);
  }

  async function handleDissolve() {
    setDissolving(true);
    setDissolveError(null);
    try {
      await dissolveTeam();
      setShowDissolve(false);
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      setDissolveError(`チームの解散に失敗しました（${code}）`);
    } finally {
      setDissolving(false);
    }
  }

  function handleRoleChange(member: TeamMember, value: string) {
    if (value === 'editor' || value === 'viewer') {
      setDialog({ type: 'roleChange', member, newRole: value });
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createTeam({ name: teamName.trim() });
      setShowCreateTeam(false);
      setTeamName('');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';

      if (code === 'functions/not-found' && message.includes('ユーザー')) {
        setCreateError('ユーザー初期化データが見つかりません（functions/not-found）');
      } else if (code === 'functions/not-found') {
        setCreateError('createTeam 関数が見つかりません（functions/not-found）');
      } else if (code === 'functions/unauthenticated') {
        setCreateError('ログイン状態が関数に渡っていません（functions/unauthenticated）');
      } else if (code === 'functions/internal' && message.includes('Cloud Functions API')) {
        setCreateError(
          'Cloud Functions API が Firebase プロジェクトで無効です（functions/internal）'
        );
      } else if (code === 'functions/internal') {
        setCreateError('Cloud Functions 側で内部エラーが発生しました（functions/internal）');
      } else {
        setCreateError(`チームの作成に失敗しました（${code}）`);
      }

      console.error('createTeam failed:', err);
    } finally {
      setCreating(false);
    }
  }

  /* ── チーム未参加 ─────────────────────────────────────────── */
  if (isSolo) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="チームメンバー" />
        <div className="flex-1 overflow-y-auto p-6 max-w-lg">
          <div className="bg-card border border-border rounded-[18px] p-6">
            <h3 className="text-sm font-semibold text-text mb-1">チームに参加または作成する</h3>
            <p className="text-[12px] text-muted mb-5">
              チームメンバーとスケジュールを共有できます
            </p>
            <div className="mb-5">
              <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">
                チームコードで参加
              </p>
              <TeamJoinForm />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-medium text-muted mb-2 uppercase tracking-wide">
                新しいチームを作成
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShowCreateTeam(true)}>
                チームを作成する
              </Button>
            </div>
          </div>
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
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* トップバー */}
      <TopBar title="チームメンバー" subtitle={`${members.length}名`}>
        {isOwner && (
          <button
            onClick={() => setDialog({ type: 'transfer' })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[12px] font-semibold transition-colors"
            style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
          >
            <span className="material-icons text-[16px]">person_add</span>
            メンバーを招待
          </button>
        )}
      </TopBar>

      {/* メンバーカードグリッド */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}
        >
          {members.map((member, i) => {
            const palette = AVATAR_PALETTES[i % AVATAR_PALETTES.length];
            const isMe = member.userId === currentUser?.uid;
            const roleBadge = ROLE_BADGE[member.role];
            const initials = member.displayName.slice(0, 2).toUpperCase();

            return (
              <div
                key={member.userId}
                className="bg-card border rounded-[18px] p-5 flex items-center gap-4 transition-all"
                style={{ borderColor: isMe ? 'var(--purple)' : 'var(--border)' }}
              >
                {/* アバター */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0 relative"
                  style={{ background: palette.bg, color: palette.text }}
                >
                  {initials}
                  {/* オンラインインジケーター（オーナーと自分を常にオンライン表示） */}
                  {(isMe || member.role === 'owner') && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
                      style={{ background: 'var(--green)' }}
                    />
                  )}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-text mb-1 truncate">
                    {member.displayName}
                    {isMe && (
                      <span className="text-muted text-[11px] font-normal ml-1.5">（あなた）</span>
                    )}
                  </div>
                  <div
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                    style={{
                      background: roleBadge.bg,
                      color: roleBadge.text,
                      borderColor: roleBadge.border,
                    }}
                  >
                    {ROLE_LABELS[member.role]}
                  </div>
                </div>

                {/* オーナー向けアクション */}
                {isOwner && !isMe && member.role !== 'owner' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      className="text-[11px] border border-border rounded-[6px] px-2 py-1 bg-surface text-text outline-none"
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      onClick={() => setDialog({ type: 'remove', member })}
                      className="text-[11px] text-muted hover:text-live transition-colors px-1.5 py-1 rounded-[4px] hover:bg-live/10"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* チーム基本情報 */}
        {currentTeam && (
          <div className="mt-6 bg-card border border-border rounded-[18px] p-5 max-w-sm">
            <p className="text-[11px] text-muted uppercase tracking-wide mb-3">チーム基本情報</p>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] text-muted mb-0.5">チーム名</p>
                <p className="text-[15px] font-bold text-text">{currentTeam.name}</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => { setEditNameValue(currentTeam.name); setShowEditName(true); }}
                  className="text-[11px] text-muted hover:text-text transition-colors px-2 py-1 rounded-[6px] hover:bg-surface border border-border"
                >
                  編集
                </button>
              )}
            </div>
            <div>
              <p className="text-[11px] text-muted mb-1">チームコード</p>
              <p className="text-[18px] font-mono font-bold text-purple-l tracking-widest">
                {currentTeam.teamCode}
              </p>
            </div>
          </div>
        )}

        {/* 脱退 */}
        {!isOwner && (
          <div className="mt-4 max-w-sm">
            <button
              onClick={() => setDialog({ type: 'leave' })}
              className="text-[12px] text-muted hover:text-live transition-colors"
            >
              チームを脱退する
            </button>
          </div>
        )}

        {/* 危険ゾーン（オーナーのみ） */}
        {isOwner && (
          <div className="mt-6 max-w-sm border border-live/30 rounded-[18px] p-5">
            <p className="text-[11px] font-bold text-live uppercase tracking-wide mb-1">危険ゾーン</p>
            <p className="text-[12px] text-muted mb-4">
              この操作は元に戻せません。チームを解散すると全メンバーがソロ状態に戻ります。
            </p>
            <button
              onClick={openDissolveModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors border border-live/40 text-live hover:bg-live/10"
            >
              <span className="material-icons text-[18px]">group_remove</span>
              チームを解散する
            </button>
          </div>
        )}
      </div>

      {/* ── チーム名編集モーダル ──────────────────────────────── */}
      <Modal
        open={showEditName}
        onClose={() => setShowEditName(false)}
        title="チーム名を編集"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditName(false)}>
              キャンセル
            </Button>
            <Button loading={savingName} onClick={handleSaveName}>
              保存
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveName}>
          <Input
            label="チーム名"
            value={editNameValue}
            onChange={(e) => setEditNameValue(e.target.value)}
            placeholder="例: 配信チーム"
            maxLength={50}
            error={editNameError ?? undefined}
          />
        </form>
      </Modal>

      {/* ── チーム解散確認モーダル ───────────────────────────── */}
      <Modal
        open={showDissolve}
        onClose={() => setShowDissolve(false)}
        title="チームを解散する"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDissolve(false)}>
              キャンセル
            </Button>
            <Button
              loading={dissolving}
              onClick={handleDissolve}
              disabled={dissolveConfirmName !== currentTeam?.name}
              style={
                dissolveConfirmName === currentTeam?.name
                  ? { background: 'var(--live)', color: '#fff' }
                  : undefined
              }
            >
              解散する
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div
            className="rounded-[10px] p-3 border text-[12px]"
            style={{ background: 'rgba(226,53,57,0.08)', borderColor: 'rgba(226,53,57,0.3)', color: 'var(--live)' }}
          >
            <strong>注意：</strong>この操作は元に戻せません。チーム内のすべてのデータが削除され、全メンバーがソロ状態に戻ります。
          </div>
          <div>
            <p className="text-[12px] text-muted mb-1.5">
              確認のため、チーム名「<strong className="text-text">{currentTeam?.name}</strong>」を入力してください。
            </p>
            <Input
              label=""
              value={dissolveConfirmName}
              onChange={(e) => setDissolveConfirmName(e.target.value)}
              placeholder={currentTeam?.name ?? ''}
              error={dissolveError ?? undefined}
            />
          </div>
        </div>
      </Modal>

      {/* ── ダイアログ ─────────────────────────────────────── */}
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
          pendingTaskCount={0}
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
