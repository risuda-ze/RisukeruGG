import { create } from 'zustand';
import type { ExportNotice } from '@/lib/googleCalendar/run';

/**
 * Google カレンダー書き出し（SC-008 系）の進行と結果。
 * 書き出し中に別の画面へ移動しても結果を失わないよう、画面ではなくストアに持つ（SC-008-1）。
 */
interface GoogleCalendarExportState {
  running: boolean;
  /** 書き出し中の進行（件数が決まるまでは null） */
  progress: { done: number; total: number } | null;
  /** 直近の結果と、それがどのチームの書き出しか */
  notice: { teamId: string; notice: ExportNotice } | null;

  start: () => void;
  setProgress: (done: number, total: number) => void;
  finish: (teamId: string, notice: ExportNotice) => void;
  dismissNotice: () => void;
  /** ログアウト時に、前の利用者の進行・結果を消す */
  reset: () => void;
}

export const useGoogleCalendarExportStore = create<GoogleCalendarExportState>((set) => ({
  running: false,
  progress: null,
  notice: null,

  start: () => set({ running: true, progress: null, notice: null }),
  setProgress: (done, total) => set({ progress: { done, total } }),
  finish: (teamId, notice) => set({ running: false, progress: null, notice: { teamId, notice } }),
  dismissNotice: () => set({ notice: null }),
  reset: () => set({ running: false, progress: null, notice: null }),
}));
