import {
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  getDocs,
  addDoc,
  type FirestoreError,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { createdFields, updatedFields } from '@/lib/firebase/audit';
import type { Brief, BriefEvent, Step, StepComment } from '@/types/briefs';
import type { BriefsPort, BriefTransaction } from '@/lib/briefs/operations/port';
import { stripUndefined, toBrief, toBriefEvent, toStep, toStepComment } from '@/lib/briefs/convert';

/* ── 参照パス ─────────────────────────────────────────── */

const briefsCol = (teamId: string) => collection(db, 'teams', teamId, 'briefs');
const briefDoc = (teamId: string, briefId: string) => doc(db, 'teams', teamId, 'briefs', briefId);
const stepsCol = (teamId: string, briefId: string) => collection(briefDoc(teamId, briefId), 'steps');
const stepDoc = (teamId: string, briefId: string, stepId: string) => doc(stepsCol(teamId, briefId), stepId);
const eventsCol = (teamId: string, briefId: string) => collection(briefDoc(teamId, briefId), 'briefEvents');
const commentsCol = (teamId: string, briefId: string, stepId: string) =>
  collection(stepDoc(teamId, briefId, stepId), 'comments');

/* ── 購読 ─────────────────────────────────────────────── */

export function subscribeBriefs(
  teamId: string,
  callback: (briefs: Brief[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  const q = query(briefsCol(teamId), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toBrief(teamId, d.id, d.data() as Record<string, unknown>)));
    },
    onError
  );
}

/** チーム内の全工程（コレクショングループ）。自分の工程一覧・一覧の進捗表示に使う */
export function subscribeTeamSteps(
  teamId: string,
  callback: (steps: Step[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  const q = query(collectionGroup(db, 'steps'), where('teamId', '==', teamId));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toStep(d.id, d.data() as Record<string, unknown>)));
    },
    onError
  );
}

export function subscribeStepComments(
  teamId: string,
  briefId: string,
  stepId: string,
  callback: (comments: StepComment[]) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  const q = query(commentsCol(teamId, briefId, stepId), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toStepComment(d.id, d.data() as Record<string, unknown>)));
    },
    onError
  );
}

export function subscribeBriefEvents(
  teamId: string,
  briefId: string,
  callback: (events: BriefEvent[]) => void,
  onError?: (err: FirestoreError) => void,
  max = 50
): Unsubscribe {
  const q = query(eventsCol(teamId, briefId), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => {
      callback(snap.docs.map((d) => toBriefEvent(d.id, d.data() as Record<string, unknown>)));
    },
    onError
  );
}

export async function addStepComment(
  teamId: string,
  briefId: string,
  stepId: string,
  comment: { authorId: string; authorName: string; body: string }
): Promise<void> {
  await addDoc(commentsCol(teamId, briefId, stepId), {
    ...comment,
    source: 'web',
    discordMessageId: null,
    createdAt: serverTimestamp(),
  });
}

/* ── 操作層ポート（クライアント SDK 実装） ───────────────── */

/**
 * Firestore クライアント SDK で操作層のポートを実装する。
 * commit は writeBatch で原子的に適用し、Firestore ルールによる権限チェックを受ける。
 */
export class FirestoreBriefsPort implements BriefsPort {
  newId(): string {
    return doc(collection(db, '_ids')).id;
  }

  async loadBrief(teamId: string, briefId: string) {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(briefDoc(teamId, briefId));
    if (!snap.exists()) return null;
    const stepsSnap = await getDocs(query(stepsCol(teamId, briefId), orderBy('order', 'asc')));
    return {
      brief: toBrief(teamId, snap.id, snap.data() as Record<string, unknown>),
      steps: stepsSnap.docs.map((d) => toStep(d.id, d.data() as Record<string, unknown>)),
    };
  }

  async commit(teamId: string, tx: BriefTransaction): Promise<void> {
    if (tx.deleteBrief) {
      await deleteBriefTree(teamId, tx.briefId);
      return;
    }
    const batch = writeBatch(db);
    const now = serverTimestamp();

    if (tx.createBrief) {
      const { id, ...rest } = tx.createBrief;
      batch.set(briefDoc(teamId, id), {
        ...rest,
        teamId,
        discord: null,
        ...createdFields(tx.actor),
      });
    }
    if (tx.briefPatch && Object.keys(tx.briefPatch).length > 0) {
      batch.update(briefDoc(teamId, tx.briefId), {
        ...stripUndefined(tx.briefPatch),
        ...updatedFields(tx.actor),
      });
    } else if (tx.stepPatches.length > 0 || tx.stepCreates.length > 0 || tx.stepDeletes.length > 0) {
      // 工程の変更でもブリーフの updatedAt を進める（一覧の並び・差分の目印）
      batch.update(briefDoc(teamId, tx.briefId), updatedFields(tx.actor));
    }
    for (const c of tx.stepCreates) {
      const { id, ...rest } = c;
      batch.set(stepDoc(teamId, tx.briefId, id), {
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
      batch.update(stepDoc(teamId, tx.briefId, stepId), {
        ...stripUndefined(patch),
        ...updatedFields(tx.actor),
      });
    }
    // 工程は配下のコメントごと消す。読み取り後に追加されたコメントは残りうるが、工程が消えた後の作成はルールが拒否する
    for (const stepId of tx.stepDeletes) {
      const comments = await getDocs(commentsCol(teamId, tx.briefId, stepId));
      for (const comment of comments.docs) batch.delete(comment.ref);
      batch.delete(stepDoc(teamId, tx.briefId, stepId));
    }
    for (const e of tx.events) {
      batch.set(doc(eventsCol(teamId, tx.briefId)), { ...e, createdAt: now });
    }
    await batch.commit();
  }
}

/**
 * ブリーフを配下（工程・工程コメント・差分）ごと削除する。
 * 1 回の commit で原子的に消す（PD-061）。途中まで消えた状態は作らない。
 * リクエストの大きさの上限などで commit が失敗した場合は何も消えず、エラーをそのまま呼び出し元へ返す。
 */
async function deleteBriefTree(teamId: string, briefId: string): Promise<void> {
  const stepsSnap = await getDocs(stepsCol(teamId, briefId));
  const batch = writeBatch(db);
  for (const step of stepsSnap.docs) {
    const comments = await getDocs(commentsCol(teamId, briefId, step.id));
    for (const comment of comments.docs) batch.delete(comment.ref);
    batch.delete(step.ref);
  }
  const events = await getDocs(eventsCol(teamId, briefId));
  for (const event of events.docs) batch.delete(event.ref);
  batch.delete(briefDoc(teamId, briefId));
  await batch.commit();
}

export const firestoreBriefsPort = new FirestoreBriefsPort();
