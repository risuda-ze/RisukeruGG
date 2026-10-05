import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { BriefsPort, BriefTransaction } from '@/lib/briefs/operations/port';
import { stripUndefined, toBrief, toStep } from '@/lib/briefs/convert';

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
    const batch = this.db.batch();
    const now = FieldValue.serverTimestamp();
    const briefRef = this.db.doc(`teams/${teamId}/briefs/${tx.briefId}`);

    if (tx.createBrief) {
      const { id, ...rest } = tx.createBrief;
      batch.set(this.db.doc(`teams/${teamId}/briefs/${id}`), {
        ...rest,
        teamId,
        discord: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (tx.briefPatch && Object.keys(tx.briefPatch).length > 0) {
      batch.update(briefRef, { ...stripUndefined(tx.briefPatch), updatedAt: now });
    } else if (tx.stepPatches.length > 0 || tx.stepCreates.length > 0 || tx.stepDeletes.length > 0) {
      batch.update(briefRef, { updatedAt: now });
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
        createdAt: now,
        updatedAt: now,
      });
    }
    for (const { stepId, patch } of tx.stepPatches) {
      batch.update(briefRef.collection('steps').doc(stepId), { ...stripUndefined(patch), updatedAt: now });
    }
    for (const stepId of tx.stepDeletes) {
      batch.delete(briefRef.collection('steps').doc(stepId));
    }
    for (const e of tx.events) {
      batch.set(briefRef.collection('briefEvents').doc(), { ...e, createdAt: now });
    }
    await batch.commit();
  }
}
