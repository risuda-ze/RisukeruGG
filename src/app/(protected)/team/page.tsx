'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth';
import { TopBar } from '@/components/layout/TopBar';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, fieldLabelClass } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import { RoleChangeDialog } from '@/components/team/RoleChangeDialog';
import { RemoveMemberDialog } from '@/components/team/RemoveMemberDialog';
import { DiscordUsernameDialog } from '@/components/team/DiscordUsernameDialog';
import { LeaveTeamDialog } from '@/components/team/LeaveTeamDialog';
import { TeamJoinForm } from '@/components/team/TeamJoinForm';
import { createTeam, dissolveTeam } from '@/lib/repositories/teams';
import { trackEvent } from '@/lib/analytics';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';
import { DutyChips } from '@/components/team/DutyChips';
import { ROLE_BADGE_VARIANT, ROLE_LABELS, sectionTitleClass } from '@/components/team/memberStyle';
import { MEMBER_DUTIES, MEMBER_DUTY_LABELS } from '@/types/entities';
import type { MemberDuty, TeamMember } from '@/types/entities';

type DialogState =
  | { type: 'roleChange'; member: TeamMember; newRole: 'member' | 'rom' | 'operator' }
  | { type: 'remove'; member: TeamMember }
  | { type: 'leave' }
  | { type: 'discord'; member: TeamMember }
  | null;

type Tab = 'members' | 'team';

/** メンバー一覧の列。広い幅では表の列、狭い幅では 1 列の縦積み */
const MEMBER_GRID =
  'px-4 md:px-7 @4xl:grid-cols-[minmax(13rem,1.4fr)_11rem_minmax(12rem,1.4fr)_minmax(14rem,1.2fr)_7rem] @4xl:items-center @4xl:gap-x-6';

/** 一覧の 1 項目。狭い幅では左に項目名を出し、表の幅では列見出しに任せる */
function MemberField({
  label,
  hideEmpty = false,
  children,
}: {
  label: string;
  hideEmpty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-4 pl-[54px] @4xl:pl-0',
        hideEmpty && 'hidden @4xl:flex'
      )}
    >
      <span className="eyebrow w-16 shrink-0 text-text-2 @4xl:sr-only">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={null}>
      <TeamPageInner />
    </Suspense>
  );
}

function TeamPageInner() {
  // /team?tab=team でチームタブを直接開ける
  const initialTab: Tab = useSearchParams().get('tab') === 'team' ? 'team' : 'members';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [dutyFilter, setDutyFilter] = useState<MemberDuty | null>(null);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
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
  const isOperator = myMember?.role === 'operator';
  const isSolo = members.length <= 1 && !teamId;
  const q = query.trim().toLowerCase();
  const filteredMembers = members.filter(
    (m) =>
      (!dutyFilter || m.duties.includes(dutyFilter)) &&
      (!q ||
        m.displayName.toLowerCase().includes(q) ||
        (m.discordUsername ?? '').toLowerCase().includes(q))
  );

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
    if (value === 'member' || value === 'rom' || value === 'operator') {
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
      trackEvent('team_create');
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
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-lg">
          <Card>
            <h3 className="text-sm font-semibold text-text mb-1">チームに参加または作成する</h3>
            <p className="text-[12px] text-text-muted mb-5">
              チームメンバーとスケジュールを共有できます
            </p>
            <div className="mb-5">
              <p className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wide">
                チームコードで参加
              </p>
              <TeamJoinForm />
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-[11px] font-medium text-text-muted mb-2 uppercase tracking-wide">
                新しいチームを作成
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShowCreateTeam(true)}>
                チームを作成する
              </Button>
            </div>
          </Card>
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
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="チームメンバー" subtitle={`${members.length}名`} />

      {/* タブ。対応不可時間と同じく、カードを使わず全幅の帯で区切る */}
      <div role="tablist" className="flex shrink-0 gap-1 border-b border-border px-4 md:px-7">
        {(
          [
            ['members', 'メンバー'],
            ['team', 'チーム'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px flex min-h-11 cursor-pointer items-center border-b-2 px-4 text-sm font-semibold transition-colors duration-(--duration-fast)',
              tab === key
                ? 'border-brand text-text'
                : 'border-transparent text-text-2 hover:text-text'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'members' && (
        <>
          {/* 絞り込み */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-surface px-4 py-3 md:px-7">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="名前・Discord 名で絞り込み"
                aria-label="メンバーを絞り込み"
                className="h-11 w-full rounded-sm border border-border bg-card pr-3 pl-9 text-sm text-text placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div
              role="group"
              aria-label="担当分野で絞り込み"
              className="-mx-4 flex w-[calc(100%+2rem)] gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0"
            >
              {MEMBER_DUTIES.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={dutyFilter === d}
                  onClick={() => setDutyFilter(dutyFilter === d ? null : d)}
                  className={cn(
                    'min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-sm border px-3 text-sm transition-colors duration-(--duration-fast)',
                    dutyFilter === d
                      ? 'border-primary bg-primary text-text-on-primary'
                      : 'border-border bg-card text-text-2 hover:border-border-strong hover:text-text'
                  )}
                >
                  {MEMBER_DUTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/*
            メンバー一覧（DESIGN.md Table / List）。行は交互に canvas / surface、hover で surface-2。
            幅に余裕があるときは列をそろえた表、狭いときは項目名つきの縦積みにする（コンテナ幅で切り替え）
          */}
          <div className="@container flex-1 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-text-2 md:px-7">
                条件に合うメンバーはいません
              </p>
            ) : (
              <>
                <div
                  aria-hidden
                  className={cn(
                    MEMBER_GRID,
                    'hidden border-b border-border bg-surface-2 py-2.5 @4xl:grid'
                  )}
                >
                  {['メンバー', 'ロール', '担当分野', 'Discord', '操作'].map((label) => (
                    <span key={label} className="eyebrow text-text-2">
                      {label}
                    </span>
                  ))}
                </div>
                <ul>
                  {filteredMembers.map((member) => {
                    const isMe = member.userId === currentUser?.uid;
                    const canEditDiscord = isOperator || isMe;
                    const canManage = isOperator && !isMe;
                    return (
                      <li
                        key={member.userId}
                        className={cn(
                          MEMBER_GRID,
                          'relative grid gap-y-3 py-5 transition-colors duration-(--duration-instant) odd:bg-canvas even:bg-surface hover:bg-surface-2 @4xl:py-4'
                        )}
                      >
                        {/* メンバー。行全体を詳細へのリンクにする（操作は z-10 で上に出す） */}
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            initials={member.displayName.slice(0, 2)}
                            src={member.avatarUrl}
                            size="lg"
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/team/${member.userId}`}
                              className="block truncate text-base font-semibold text-text no-underline after:absolute after:inset-0 hover:underline"
                            >
                              {member.displayName}
                            </Link>
                            {isMe && <span className="text-caption text-text-2">あなた</span>}
                          </div>
                        </div>

                        <MemberField label="ロール">
                          {canManage ? (
                            <div className="relative z-10">
                              <Dropdown
                                value={member.role}
                                options={[
                                  { value: 'operator', label: 'オペレーター' },
                                  { value: 'member', label: 'メンバー' },
                                  { value: 'rom', label: 'ROM専' },
                                ]}
                                onChange={(v) => handleRoleChange(member, v)}
                                size="sm"
                              />
                            </div>
                          ) : (
                            <Badge variant={ROLE_BADGE_VARIANT[member.role]}>
                              {ROLE_LABELS[member.role]}
                            </Badge>
                          )}
                        </MemberField>

                        <MemberField label="担当分野">
                          {member.duties.length > 0 ? (
                            <DutyChips duties={member.duties} />
                          ) : (
                            <span className="text-sm text-text-muted">未設定</span>
                          )}
                        </MemberField>

                        {/* Discord ユーザー名（TE-012）。本人とオペレーターが編集できる */}
                        <MemberField label="Discord">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                            <span
                              className={cn(
                                'truncate text-sm',
                                member.discordUsername ? 'text-text' : 'text-text-muted'
                              )}
                            >
                              {member.discordUsername ? `@${member.discordUsername}` : '未設定'}
                            </span>
                            {canEditDiscord && (
                              <Button
                                variant="subtle"
                                size="sm"
                                className="relative z-10"
                                onClick={() => setDialog({ type: 'discord', member })}
                                aria-label={`${member.displayName} の Discord ユーザー名を編集`}
                              >
                                <Icon name="edit" size={14} />
                                編集
                              </Button>
                            )}
                          </div>
                        </MemberField>

                        <MemberField label="操作" hideEmpty={!canManage}>
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="relative z-10 text-danger hover:bg-danger-tint"
                              onClick={() => setDialog({ type: 'remove', member })}
                              aria-label={`${member.displayName} をチームから削除`}
                            >
                              <Icon name="person_off" size={14} />
                              削除
                            </Button>
                          )}
                        </MemberField>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </>
      )}

      {tab === 'team' && (
        <div className="flex-1 overflow-y-auto">
          {/* チームの基本情報 */}
          {currentTeam && (
            <section className="border-b border-border px-4 py-6 md:px-7">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className={sectionTitleClass}>チームの基本情報</h2>
                {isOperator && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditNameValue(currentTeam.name);
                      setShowEditName(true);
                    }}
                  >
                    チーム名を編集
                  </Button>
                )}
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className={fieldLabelClass}>チーム名</dt>
                  <dd className="mt-1 text-base text-text">{currentTeam.name}</dd>
                </div>
                <div>
                  <dt className={fieldLabelClass}>チームコード</dt>
                  <dd className="font-num mt-1 text-h3 tracking-widest text-text">
                    {currentTeam.teamCode}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* 別のチームに所属する */}
          <section className="border-b border-border px-4 py-6 md:px-7">
            <h2 className={cn(sectionTitleClass, 'mb-1')}>別のチームに所属する</h2>
            <p className="mb-4 text-sm text-text-2">
              チームコードを入力して、追加のチームに所属できます。現在のチームから脱退して参加することもできます。
            </p>
            <div className="max-w-md">
              <TeamJoinForm />
            </div>
          </section>

          {/* 退出（全ロール） */}
          <section className="border-b border-border px-4 py-6 md:px-7">
            <h2 className={cn(sectionTitleClass, 'mb-1')}>チームから退出</h2>
            <p className="mb-4 text-sm text-text-2">
              退出すると、このチームの予定やタスクは見られなくなります。
            </p>
            <Button variant="ghost" size="sm" onClick={() => setDialog({ type: 'leave' })}>
              現在のチームから退出する
            </Button>
          </section>

          {/* チームを解散する（オペレーターのみ） */}
          {isOperator && (
            <section className="px-4 py-6 md:px-7">
              <h2 className={cn(sectionTitleClass, 'mb-1 text-danger')}>危険ゾーン</h2>
              <p className="mb-4 text-sm text-text-2">
                この操作は元に戻せません。チームを解散すると全メンバーがソロ状態に戻ります。
              </p>
              <Button variant="danger" size="sm" onClick={openDissolveModal}>
                <Icon name="group_remove" size={18} />
                チームを解散する
              </Button>
            </section>
          )}
        </div>
      )}

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
            style={{
              background: 'color-mix(in oklab, var(--danger) 8%, transparent)',
              borderColor: 'color-mix(in oklab, var(--danger) 30%, transparent)',
              color: 'var(--live)',
            }}
          >
            <strong>注意：</strong>
            この操作は元に戻せません。チーム内のすべてのデータが削除され、全メンバーがソロ状態に戻ります。
          </div>
          <div>
            <p className="text-[12px] text-text-muted mb-1.5">
              確認のため、チーム名「<strong className="text-text">{currentTeam?.name}</strong>
              」を入力してください。
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
      {dialog?.type === 'discord' && teamId && (
        <DiscordUsernameDialog
          teamId={teamId}
          member={dialog.member}
          onClose={() => setDialog(null)}
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
      <LeaveTeamDialog
        open={dialog?.type === 'leave'}
        onClose={() => setDialog(null)}
        teamId={teamId ?? ''}
        isSoloOperator={isOperator && members.length <= 1}
        isMultiOperator={isOperator && members.length > 1}
        onSuccess={() => setDialog(null)}
      />
    </div>
  );
}
