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
      className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-xl border border-zinc-200 p-4 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={handleClick}
      role="alert"
    >
      <p className="text-sm font-medium text-zinc-900">{banner.title}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{banner.body}</p>
    </div>
  );
}
