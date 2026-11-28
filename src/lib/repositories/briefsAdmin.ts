import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { BriefsPort, BriefTransaction } from '@/lib/briefs/operations/port';
import { stripUndefined, toBrief, toStep } from '@/lib/briefs/convert';
import { createdFields, updatedFields } from '@/lib/firebase/auditAdmin';

/**
 * 操作層ポートの Admin SDK 実装（Next.js API Route の Discord ボタン処理用）。
 * Firestore ルールをバイパスするため、サーバーサイドでのみ使用する。
 * 書き込みの意味はクライアント実装（FirestoreBriefsPort）と同じ。
 */
export class AdminBriefsPort implements BriefsPort {
  constructor(private readonly db: Firestore) {}

  newId(): string {
    return this.db.collection('_ids').doc().id;
  }

  async loadBrief(teamId: string, briefId: string) {
    const briefRef = this.db.doc(`teams/${teamId}/briefs/${briefId}`);
    const snap = await briefRef.get();
    if (!snap.exists) return null;
    const stepsSnap = await briefRef.collection('steps').orderBy('order', 'asc').get();
    return {
      brief: toBrief(teamId, snap.id, snap.data() as Record<string, unknown>),
      steps: stepsSnap.docs.map((d) => toStep(d.id, d.data() as Record<string, unknown>)),
    };
  }

  async commit(teamId: string, tx: BriefTransaction): Promise<void> {
    if (tx.deleteBrief) {
      // 配下（工程・工程コメント・差分）ごと、1 回の commit で原子的に削除する（PD-061）
      const target = this.db.doc(`teams/${teamId}/briefs/${tx.briefId}`);
      const deletion = this.db.batch();
      for (const step of await target.collection('steps').listDocuments()) {
        for (const comment of await step.collection('comments').listDocuments()) deletion.delete(comment);
        deletion.delete(step);
      }
      for (const event of await target.collection('briefEvents').listDocuments()) deletion.delete(event);
      deletion.delete(target);
      await deletion.commit();
      return;
    }
    const batch = this.db.batch();
    const now = FieldValue.serverTimestamp();
    const briefRef = this.db.doc(`teams/${teamId}/briefs/${tx.briefId}`);

    if (tx.createBrief) {
      const { id, ...rest } = tx.createBrief;
      batch.set(this.db.doc(`teams/${teamId}/briefs/${id}`), {
        ...rest,
        teamId,
        discord: null,
        ...createdFields(tx.actor),
      });
    }
    if (tx.briefPatch && Object.keys(tx.briefPatch).length > 0) {
      batch.update(briefRef, { ...stripUndefined(tx.briefPatch), ...updatedFields(tx.actor) });
    } else if (tx.stepPatches.length > 0 || tx.stepCreates.length > 0 || tx.stepDeletes.length > 0) {
      batch.update(briefRef, updatedFields(tx.actor));
    }
    for (const c of tx.stepCreates) {
      const { id, ...rest } = c;
      batch.set(briefRef.collection('steps').doc(id), {
        ...rest,
        briefId: tx.briefId,
        teamId,
        completedAt: null,
        completedBy: null,
        discordMessageId: null,
        ...createdFields(tx.actor),
      });
    }
    for (const { stepId, patch } of tx.stepPatches) {
      batch.update(briefRef.collection('steps').doc(stepId), {
        ...stripUndefined(patch),
        ...updatedFields(tx.actor),
      });
    }
    // 工程は配下のコメントごと消す（クライアント実装と同じ）
    for (const stepId of tx.stepDeletes) {
      const step = briefRef.collection('steps').doc(stepId);
      for (const comment of await step.collection('comments').listDocuments()) batch.delete(comment);
      batch.delete(step);
    }
    for (const e of tx.events) {
      batch.set(briefRef.collection('briefEvents').doc(), { ...e, createdAt: now });
    }
    await batch.commit();
  }
}
