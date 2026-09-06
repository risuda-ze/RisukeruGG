import type { Brief, BriefEvent, Step } from '@/types/briefs';
import type { BriefsPort, BriefTransaction } from '@/lib/briefs/operations/port';

/**
 * 操作層テスト用のメモリ実装。Firestore の writeBatch と同じ意味で、
 * 1 トランザクション分の作成・更新・削除・差分記録をまとめて適用する。
 */
export class MemoryBriefsPort implements BriefsPort {
  briefs = new Map<string, Brief>();
  steps = new Map<string, Step>();
  events: Array<BriefEvent & { briefId: string }> = [];
  committed: BriefTransaction[] = [];
  private seq = 0;
  constructor(private readonly now: Date = new Date('2026-09-06T00:00:00')) {}

  newId(): string {
    this.seq += 1;
    return `id_${this.seq}`;
  }

  async loadBrief(_teamId: string, briefId: string) {
    const brief = this.briefs.get(briefId);
    if (!brief) return null;
    const steps = [...this.steps.values()]
      .filter((s) => s.briefId === briefId)
      .sort((a, b) => a.order - b.order);
    return { brief, steps };
  }

  async commit(teamId: string, tx: BriefTransaction): Promise<void> {
    this.committed.push(tx);
    if (tx.createBrief) {
      const d = tx.createBrief;
      this.briefs.set(d.id, {
        ...d,
        teamId,
        discord: null,
        createdAt: this.now,
        updatedAt: this.now,
      });
    }
    if (tx.briefPatch) {
      const b = this.briefs.get(tx.briefId)!;
      this.briefs.set(tx.briefId, { ...b, ...tx.briefPatch, updatedAt: this.now });
    }
    for (const c of tx.stepCreates) {
      this.steps.set(c.id, {
        ...c,
        briefId: tx.briefId,
        teamId,
        completedAt: null,
        completedBy: null,
        discordMessageId: null,
        createdAt: this.now,
        updatedAt: this.now,
      });
    }
    for (const { stepId, patch } of tx.stepPatches) {
      const s = this.steps.get(stepId);
      if (s) this.steps.set(stepId, { ...s, ...patch, updatedAt: this.now });
    }
    for (const id of tx.stepDeletes) this.steps.delete(id);
    for (const e of tx.events) {
      this.events.push({ ...e, id: this.newId(), briefId: tx.briefId, createdAt: this.now });
    }
  }
}
