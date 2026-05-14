'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { markAsRead } from '@/lib/repositories/notifications';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import type { Notification } from '@/types/entities';

const REF_PATHS: Record<NonNullable<Notification['refType']>, string> = {
  schedule: '/schedule',
  task:     '/tasks',
  collab:   '/collabs',
  team:     '/team',
};

const CATEGORY_LABELS: Record<Notification['category'], string> = {
  collab:    'コラボ',
  tasks:     'タスク',
  reminders: 'リマインダー',
  system:    'システム',
};

type BadgeVariant = 'purple' | 'amber' | 'live' | 'green' | 'muted' | 'default';
const CATEGORY_BADGE: Record<Notification['category'], BadgeVariant> = {
  collab:    'live',
  tasks:     'amber',
  reminders: 'purple',
  system:    'muted',
};

/* カテゴリカラードット */
const CATEGORY_DOT: Record<Notification['category'], string> = {
  collab:    'bg-live',
  tasks:     'bg-amber',
  reminders: 'bg-purple',
  system:    'bg-green',
};

export default function NotificationsPage() {
  const router = useRouter();
  const { currentUser, currentTeam } = useAuthStore();
  const { notifications, loading, subscribe } = useNotificationsStore();
  const teamId = currentTeam?.id;

  useEffect(() => {
    if (!teamId || !currentUser?.uid) return;
    return subscribe(teamId, currentUser.uid);
  }, [teamId, currentUser?.uid, subscribe]);

  async function handleClick(notif: Notification) {
    if (!teamId) return;
    if (!notif.isRead) await markAsRead(teamId, notif.id);
    if (notif.refType && notif.refId) {
      router.push(`${REF_PATHS[notif.refType]}/${notif.refId}`);
    }
  }

  async function markAllRead() {
    if (!teamId) return;
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(unread.map((n) => markAsRead(teamId, n.id)));
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <Spinner size="lg" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="px-4 py-6 md:px-7 max-w-2xl">

      {/* ── ページヘッダー ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <h2 className="text-base font-semibold text-text">通知</h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} aria-label="すべて既読にする">
            すべて既読
          </Button>
        )}
      </div>

      {/* ── 通知リスト ─────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="text-center text-muted text-sm py-16">通知はありません</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`rounded-[12px] border p-4 cursor-pointer transition-colors ${
                notif.isRead
                  ? 'bg-card border-border hover:border-purple/30'
                  : 'bg-purple/5 border-purple/20 hover:border-purple/40'
              }`}
              role="button"
              tabIndex={0}
              aria-label={notif.title}
            >
              <div className="flex items-start gap-3">
                {/* カテゴリカラードット */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${CATEGORY_DOT[notif.category]}`}
                  aria-hidden="true"
                />

                {/* テキスト */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-[13px] font-medium text-text">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="w-1.5 h-1.5 bg-purple-l rounded-full shrink-0" aria-label="未読" />
                    )}
                  </div>
                  <p className="text-[12px] text-muted leading-relaxed">{notif.body}</p>
                </div>

                {/* 右側: バッジ + 時刻 */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant={CATEGORY_BADGE[notif.category]}>
                    {CATEGORY_LABELS[notif.category]}
                  </Badge>
                  <span className="text-[10px] text-muted font-num">
                    {format(notif.createdAt, 'M/d HH:mm', { locale: ja })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
