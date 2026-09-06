import { create } from 'zustand';
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
  subscribe: (teamId: string) => () => void;
}

export const useBriefsStore = create<BriefsState>((set) => ({
  briefs: [],
  steps: [],
  playbooks: [],
  loading: true,

  subscribe: (teamId) => {
    set({ loading: true });
    const unsubBriefs = subscribeBriefs(teamId, (briefs) => set({ briefs, loading: false }));
    const unsubSteps = subscribeTeamSteps(teamId, (steps) => set({ steps }));
    const unsubPlaybooks = subscribePlaybooks(teamId, (playbooks) => set({ playbooks }));
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
