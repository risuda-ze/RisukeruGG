'use client';

import { useAuthStore } from '@/stores/auth';
import { useScheduleStore } from '@/stores/schedule';
import { useCategoryStore } from '@/stores/categories';
import { useGoogleCalendarExportStore } from '@/stores/googleCalendarExport';
import { createCalendarApi } from '@/lib/googleCalendar/api';
import { requestCalendarAccessToken } from '@/lib/googleCalendar/auth';
import { runExport } from '@/lib/googleCalendar/run';
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
  const categoriesLoading = useCategoryStore((s) => s.loading);

  const running = useGoogleCalendarExportStore((s) => s.running);
  const progress = useGoogleCalendarExportStore((s) => s.progress);
  const lastNotice = useGoogleCalendarExportStore((s) => s.notice);
  const dismissNotice = useGoogleCalendarExportStore((s) => s.dismissNotice);

  // 表示中のチームの予定・カテゴリ・メンバーが揃うまでは書き出せない
  // （読み込み途中の一覧で Google 側の予定を消したり、説明からカテゴリ・参加メンバーが抜けたりしないため）
  const ready =
    Boolean(currentUser && currentTeam) &&
    currentTeam?.id === currentTeamId &&
    !schedulesLoading &&
    !categoriesLoading &&
    members.length > 0;

  async function run() {
    if (!ready || !currentUser || !currentTeamId || !currentTeam) return;
    const { start, setProgress, finish } = useGoogleCalendarExportStore.getState();
    if (useGoogleCalendarExportStore.getState().running) return;
    const user = currentUser;
    const teamId = currentTeamId;

    start();
    const notice = await runExport({
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
      onProgress: setProgress,
    });
    finish(teamId, notice);
  }

  return {
    /** 書き出しを開始できる状態か */
    ready,
    running,
    progress,
    /** 表示中のチームの書き出し結果。別のチームの結果は出さない */
    notice: lastNotice && lastNotice.teamId === currentTeamId ? lastNotice.notice : null,
    /** 最終書き出し日時。未書き出しなら null */
    lastExportedAt: exportState?.exportedAt ?? null,
    run,
    dismissNotice,
  };
}
