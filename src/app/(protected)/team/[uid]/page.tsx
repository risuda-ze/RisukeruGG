'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useBriefsStore } from '@/stores/briefs';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { fieldLabelClass } from '@/components/ui/Input';
import { MemberProfileDialog } from '@/components/team/MemberProfileDialog';
import { ROLE_BADGE, ROLE_LABELS } from '@/lib/utils/teamRoles';
import { StepAlertBadges, StepStatusBadge } from '@/components/briefs/StepStatusBadge';
import { formatShortDate } from '@/lib/briefs/format';
import { selectAssignedSteps } from '@/lib/briefs/assignedSteps';
import { MEMBER_DUTY_LABELS } from '@/types/entities';

/**
 * メンバー・スタッフの詳細（TE-017）。担当分野・ひとこと・担当中の工程を表示する。
 * 対応不可時間の画面と同じく、カードを使わず全幅のセクションを罫線で区切る。
 */
export default function MemberDetailPage() {
  const { uid } = useParams<{ uid: string }>();
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const briefs = useBriefsStore((s) => s.briefs);
  const steps = useBriefsStore((s) => s.steps);
  const subscribe = useBriefsStore((s) => s.subscribe);
  const [editing, setEditing] = useState(false);

  const teamId = currentTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  const member = members.find((m) => m.userId === uid);
  const assigned = useMemo(() => selectAssignedSteps(steps, briefs, uid), [steps, briefs, uid]);

  const back = (
    <Link href="/team" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
      <Icon name="arrow_back" size={14} />
      メンバー・スタッフ一覧
    </Link>
  );

  if (!member) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar title="メンバー・スタッフの詳細">{back}</TopBar>
        <p className="px-4 py-10 text-center text-sm text-text-2 md:px-7">
          メンバー・スタッフが見つかりません
        </p>
      </div>
    );
  }

  const isMe = member.userId === currentUser?.uid;
  const isOperator = members.find((m) => m.userId === currentUser?.uid)?.role === 'operator';

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="メンバー・スタッフの詳細">{back}</TopBar>
      <div className="flex-1 overflow-y-auto">
        {/* 見出し: アバター・名前・ロール */}
        <section className="flex items-center gap-4 border-b border-border bg-surface px-4 py-5 md:px-7">
          <Avatar initials={member.displayName} src={member.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h2 className="text-h2 truncate text-text">{member.displayName}</h2>
              {isMe && <span className="text-caption text-text-2">あなた</span>}
            </div>
            <div className="mt-1.5">
              <Badge variant={ROLE_BADGE[member.role]}>{ROLE_LABELS[member.role]}</Badge>
            </div>
          </div>
          {(isMe || isOperator) && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Icon name="edit" size={14} />
              編集
            </Button>
          )}
        </section>

        {/* プロフィール */}
        <section className="border-b border-border px-4 py-6 md:px-7">
          <h3 className={`${fieldLabelClass} mb-4`}>プロフィール</h3>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className={fieldLabelClass}>担当分野</dt>
              <dd className="mt-1.5">
                {member.duties.length > 0 ? (
                  <ul aria-label="担当分野" className="flex flex-wrap gap-1">
                    {member.duties.map((d) => (
                      <li key={d}>
                        <Badge variant="info">{MEMBER_DUTY_LABELS[d]}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-sm text-text-muted">未設定</span>
                )}
              </dd>
            </div>
            <div>
              <dt className={fieldLabelClass}>Discord</dt>
              <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-text">
                <Icon name="discord" size={14} className="text-text-2" />
                {member.discordUsername ? (
                  `@${member.discordUsername}`
                ) : (
                  <span className="text-text-muted">未設定</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className={fieldLabelClass}>ひとこと</dt>
              <dd className="mt-1.5 text-sm break-all text-text">
                {member.note ?? <span className="text-text-muted">未設定</span>}
              </dd>
            </div>
            <div>
              <dt className={fieldLabelClass}>参加日</dt>
              <dd className="font-num mt-1.5 text-sm text-text">
                {member.joinedAt.toLocaleDateString('ja-JP')}
              </dd>
            </div>
          </dl>
          {/* 対応不可時間は埋め込まず、画面へのリンクだけを置く（TE-017-5） */}
          <Link
            href="/unavailability"
            className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} mt-5`}
          >
            <Icon name="person_off" size={14} />
            対応不可時間を見る
          </Link>
        </section>

        {/* 担当中の工程。行は交互背景のリスト（DESIGN.md Table / List） */}
        <section className="pt-6">
          <h3 className={`${fieldLabelClass} mb-3 px-4 md:px-7`}>
            担当中の工程
            <span className="font-num ml-2">{assigned.length}</span>
          </h3>
          {assigned.length === 0 ? (
            <p className="px-4 pb-6 text-sm text-text-2 md:px-7">担当している工程はありません</p>
          ) : (
            <ul>
              {assigned.map(({ step, brief }) => (
                <li key={step.id} className="even:bg-surface">
                  <Link
                    href={`/briefs/${brief.id}?step=${step.id}`}
                    className="flex items-center gap-3 px-4 py-3 no-underline transition-colors duration-(--duration-instant) hover:bg-surface-2 md:px-7"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-caption truncate text-text-2">{brief.title}</div>
                      <div className="truncate text-sm font-semibold text-text">{step.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <StepStatusBadge status={step.status} />
                        <StepAlertBadges step={step} />
                      </div>
                    </div>
                    <div className="font-num flex shrink-0 items-center gap-1 text-sm text-text-2">
                      <Icon name="event" size={14} className="text-text-muted" />
                      {formatShortDate(step.dueDate)}
                    </div>
                    <Icon name="chevron_right" size={18} className="shrink-0 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {editing && teamId && (
        <MemberProfileDialog teamId={teamId} member={member} onClose={() => setEditing(false)} />
      )}
    </div>
  );
}
