'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useCategoryStore } from '@/stores/categories';
import { createCalendarApi } from '@/lib/googleCalendar/api';
import { requestCalendarAccessToken } from '@/lib/googleCalendar/auth';
import { runExport, type ExportNotice } from '@/lib/googleCalendar/run';
import { saveExportCalendarId, saveExportedAt } from '@/lib/repositories/googleCalendarExports';

/** アクティブチームの予定を自分の Google カレンダーへ書き出す（SC-008 系） */
export function useGoogleCalendarExport() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeamId = useAuthStore((s) => s.currentTeamId);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const exportState = useAuthStore((s) =>
    s.currentTeamId ? s.googleCalendarExports[s.currentTeamId] : undefined
  );
  const schedules = useScheduleStore((s) => s.schedules);
  const schedulesLoading = useScheduleStore((s) => s.loading);
  const categories = useCategoryStore((s) => s.categories);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [notice, setNotice] = useState<ExportNotice | null>(null);

  // 予定の読み込みが終わるまでは書き出せない（読み込み途中の一覧で Google 側の予定を消さないため）
  const ready = Boolean(currentUser && currentTeamId && currentTeam) && !schedulesLoading;

  async function run() {
    if (!currentUser || !currentTeamId || !currentTeam || schedulesLoading || running) return;
    const user = currentUser;
    const teamId = currentTeamId;

    setRunning(true);
    setProgress(null);
    setNotice(null);
    try {
      setNotice(
        await runExport({
          email: user.email,
          teamName: currentTeam.name,
          calendarId: exportState?.calendarId ?? null,
          schedules,
          context: {
            memberNames: Object.fromEntries(members.map((m) => [m.userId, m.displayName])),
            categoryNames: Object.fromEntries(categories.map((c) => [c.id, c.name])),
          },
          now: new Date(),
          requestAccessToken: () => requestCalendarAccessToken(user),
          createApi: createCalendarApi,
          saveCalendarId: (calendarId) => saveExportCalendarId(user.uid, teamId, calendarId),
          saveExportedAt: () => saveExportedAt(user.uid, teamId),
          onProgress: (done, total) => setProgress({ done, total }),
        })
      );
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  return {
    /** 書き出しを開始できる状態か */
    ready,
    running,
    /** 書き出し中の進行（件数が決まるまでは null） */
    progress,
    notice,
    /** 最終書き出し日時。未書き出しなら null */
    lastExportedAt: exportState?.exportedAt ?? null,
    run,
    dismissNotice: () => setNotice(null),
  };
}
