import { differenceInCalendarDays, startOfDay } from 'date-fns';

export type UrgencyLevel = 'over' | 'today' | 'soon' | 'normal' | 'done';

/** 期限日と完了フラグから緊急度レベルを計算する。soon = 期限2日以内（today 除く） */
export function getUrgencyLevel(dueDate: Date | null, isDone: boolean): UrgencyLevel {
  if (isDone) return 'done';
  if (!dueDate) return 'normal';
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(startOfDay(dueDate), today);
  if (diff < 0) return 'over';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'soon';
  return 'normal';
}

/** over 状態のタスクについて何日超過しているかを返す */
export function getOverDays(dueDate: Date): number {
  const today = startOfDay(new Date());
  return differenceInCalendarDays(today, startOfDay(dueDate));
}
