import { create } from 'zustand';
import type { FirestoreError } from 'firebase/firestore';
import { subscribeBriefs, subscribeTeamSteps } from '@/lib/repositories/briefs';
import { subscribePlaybooks } from '@/lib/repositories/playbooks';
import type { Brief, Playbook, Step } from '@/types/briefs';

/**
 * タスク管理 v2（1枚紙）のストア。
 * ブリーフ・チーム内の全工程・進め方を購読し、各画面はここから派生値を作る。
 */
interface BriefsState {
  briefs: Brief[];
  steps: Step[];
  playbooks: Playbook[];
  loading: boolean;
  /** 購読エラーの利用者向けメッセージ。null なら正常 */
  error: string | null;
  subscribe: (teamId: string) => () => void;
}

/** Firestore の購読エラーを利用者向けの日本語にする（rules / indexes の未デプロイを切り分けられる文言） */
export function briefsLoadErrorMessage(err: Pick<FirestoreError, 'code'>): string {
  switch (err.code) {
    case 'permission-denied':
      return 'タスク管理 v2 のデータを読み込む権限がありません。Firestore ルールが最新か管理者に確認してください';
    case 'failed-precondition':
      return 'タスク管理 v2 の読み込みに必要なインデックスがありません。管理者に確認してください';
    default:
      return `タスク管理 v2 のデータを読み込めませんでした（${err.code}）`;
  }
}

export const useBriefsStore = create<BriefsState>((set) => ({
  briefs: [],
  steps: [],
  playbooks: [],
  loading: true,
  error: null,

  subscribe: (teamId) => {
    set({ loading: true, error: null });
    // 読み取りが拒否されても onSnapshot の成功コールバックは呼ばれないため、
    // エラー側で loading を止めないとスピナーが出続ける
    const onError = (err: FirestoreError) => {
      console.error('[briefs] subscribe failed', err);
      set({ loading: false, error: briefsLoadErrorMessage(err) });
    };
    const unsubBriefs = subscribeBriefs(teamId, (briefs) => set({ briefs, loading: false }), onError);
    const unsubSteps = subscribeTeamSteps(teamId, (steps) => set({ steps }), onError);
    const unsubPlaybooks = subscribePlaybooks(teamId, (playbooks) => set({ playbooks }), onError);
    return () => {
      unsubBriefs();
      unsubSteps();
      unsubPlaybooks();
    };
  },
}));

/** ブリーフ配下の工程を表示順で返す */
export function selectStepsOfBrief(steps: Step[], briefId: string): Step[] {
  return steps.filter((s) => s.briefId === briefId).sort((a, b) => a.order - b.order);
}
