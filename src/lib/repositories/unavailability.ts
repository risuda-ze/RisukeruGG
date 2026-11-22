import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { toJstDateString } from '@/lib/googleCalendar/export';
import { storageWindow } from '@/lib/unavailability/range';
import {
  parseUnavailabilityMonth,
  unavailabilitySaveSchema,
} from '@/lib/validations/unavailability';
import type { UnavailabilitySaveInput } from '@/lib/validations/unavailability';
import type { DayMasks, UnavailabilityMonth } from '@/types/unavailability';

const COLLECTION = 'unavailability';

/** チーム全員の 1 ヶ月分を購読する。形が合わないドキュメントは捨てる */
export function subscribeUnavailabilityMonth(
  teamId: string,
  month: string,
  callback: (months: UnavailabilityMonth[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, 'teams', teamId, COLLECTION), where('month', '==', month)),
    (snap) => {
      callback(
        snap.docs.flatMap((d) => {
          // 自分の保存直後は updatedAt（serverTimestamp）が未確定なので、推定値で受け取る
          const parsed = parseUnavailabilityMonth(d.data({ serverTimestamps: 'estimate' }));
          return parsed ? [parsed] : [];
        })
      );
    },
    onError
  );
}

/**
 * 自分の 1 ヶ月分を保存する（書き込み 1 回・読み取りなし）。
 * `changes.days` は変更した日だけを渡し、0 の日はキーを消す。
 * `changes.notes` はメモに変更があるときだけ、その月のメモ全件を渡す。
 */
export async function saveUnavailabilityMonth(
  teamId: string,
  userId: string,
  month: string,
  changes: UnavailabilitySaveInput,
  now: Date = new Date()
): Promise<void> {
  const { days, notes } = unavailabilitySaveSchema(month).parse(changes);
  if (!storageWindow(toJstDateString(now)).months.includes(month)) {
    throw new RangeError(`入力できる範囲（前月〜翌月）の外です: ${month}`);
  }

  const dayEntries = Object.entries(days);
  await setDoc(
    doc(db, 'teams', teamId, COLLECTION, `${userId}_${month}`),
    {
      userId,
      month,
      // 空の map を merge で書くと既存の days を空で上書きするため、変更があるときだけ含める
      ...(dayEntries.length > 0 && {
        days: Object.fromEntries(
          dayEntries.map(([date, mask]) => [date, mask === 0 ? deleteField() : mask])
        ),
      }),
      ...(notes && { notes }),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * 自分の 1 ヶ月分に、対応不可を追記する（CSV・定期入力の和集合保存）。
 * 既存の日マスクと OR するため読んでから書く。読み書きの間に別の保存が入っても消さないよう、
 * トランザクションで行う。既存の対応不可とメモは変えない。
 */
export async function mergeUnavailabilityMonth(
  teamId: string,
  userId: string,
  month: string,
  added: DayMasks,
  now: Date = new Date()
): Promise<void> {
  const { days } = unavailabilitySaveSchema(month).parse({ days: added });
  if (!storageWindow(toJstDateString(now)).months.includes(month)) {
    throw new RangeError(`入力できる範囲（前月〜翌月）の外です: ${month}`);
  }
  const entries = Object.entries(days).filter(([, mask]) => mask !== 0);
  if (entries.length === 0) return;

  const ref = doc(db, 'teams', teamId, COLLECTION, `${userId}_${month}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    // 形が合わない既存の値は、読み取り側と同じく無いものとして扱う
    const existing = snap.exists() ? (parseUnavailabilityMonth(snap.data())?.days ?? {}) : {};
    tx.set(
      ref,
      {
        userId,
        month,
        days: Object.fromEntries(
          entries.map(([date, mask]) => [date, (existing[date] ?? 0) | mask])
        ),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}
