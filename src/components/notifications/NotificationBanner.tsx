'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationsStore } from '@/stores/notifications';
import type { Notification } from '@/types/entities';

const REF_TYPE_PATHS: Record<NonNullable<Notification['refType']>, string> = {
  schedule: '/schedule',
  task: '/tasks',
  collab: '/collabs',
  team: '/team',
};

/* カテゴリ別カラードット */
const CATEGORY_DOT: Record<Notification['category'], string> = {
  collab: 'bg-live',
  tasks: 'bg-amber',
  reminders: 'bg-purple',
  system: 'bg-green',
};

export function NotificationBanner() {
  const { notifications } = useNotificationsStore();
  const router = useRouter();
  const [banner, setBanner] = useState<Notification | null>(null);
  const prevNotifIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentIds = new Set(notifications.map((n) => n.id));
    for (const notif of notifications) {
      if (!prevNotifIds.current.has(notif.id) && !notif.isRead) {
        setBanner(notif);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setBanner(null), 3000);
        break;
      }
    }
    prevNotifIds.current = currentIds;
  }, [notifications]);

  if (!banner) return null;

  const path = banner.refType ? REF_TYPE_PATHS[banner.refType] : null;

  function handleClick() {
    setBanner(null);
    if (path && banner?.refId) {
      router.push(`${path}/${banner.refId}`);
    }
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 max-w-sm w-full bg-card border border-border rounded-[12px] shadow-lg cursor-pointer hover:border-purple/40 transition-colors p-4"
      onClick={handleClick}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          className={`w-2 h-2 rounded-full shrink-0 mt-1 ${CATEGORY_DOT[banner.category]}`}
          aria-hidden="true"
        />
        <div>
          <p className="text-sm font-medium text-text">{banner.title}</p>
          <p className="text-[11px] text-muted mt-0.5">{banner.body}</p>
        </div>
      </div>
    </div>
  );
}
