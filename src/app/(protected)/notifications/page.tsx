'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import { markAsRead } from '@/lib/repositories/notifications';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import type { Notification } from '@/types/entities';

const REF_PATHS: Record<NonNullable<Notification['refType']>, string> = {
  schedule: '/schedule',
  task: '/tasks',
  collab: '/collabs',
  team: '/team',
};

const CATEGORY_LABELS: Record<Notification['category'], string> = {
  collab: 'コラボ',
  tasks: 'タスク',
  reminders: 'リマインダー',
  system: 'システム',
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
    if (!notif.isRead) {
      await markAsRead(teamId, notif.id);
    }
    if (notif.refType && notif.refId) {
      router.push(`${REF_PATHS[notif.refType]}/${notif.refId}`);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">通知</h1>

      {notifications.length === 0 ? (
        <div className="text-center text-zinc-500 text-sm py-16">通知はありません</div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`rounded-xl border p-4 cursor-pointer transition-colors ${
                notif.isRead
                  ? 'bg-white border-zinc-200 hover:bg-zinc-50'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-zinc-900">{notif.title}</span>
                    {!notif.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-600">{notif.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge variant="default">{CATEGORY_LABELS[notif.category]}</Badge>
                  <span className="text-xs text-zinc-400">
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
