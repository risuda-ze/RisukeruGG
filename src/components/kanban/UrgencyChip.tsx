'use client';

import { differenceInCalendarDays, startOfDay } from 'date-fns';
import type { UrgencyLevel } from '@/lib/urgency';

interface UrgencyChipProps {
  level: UrgencyLevel;
  dueDate?: Date | null;
}

export default function UrgencyChip({ level, dueDate }: UrgencyChipProps) {
  if (level === 'normal') return null;

  let label = '';
  let style: React.CSSProperties = {};

  switch (level) {
    case 'over': {
      const days = dueDate
        ? differenceInCalendarDays(startOfDay(new Date()), startOfDay(dueDate))
        : 0;
      label = `${days}日超過`;
      style = { background: 'var(--danger-dim)', color: 'var(--danger)' };
      break;
    }
    case 'today':
      label = '今日まで';
      style = { background: 'var(--warning-dim)', color: 'var(--warning)' };
      break;
    case 'soon':
      label = 'もうすぐ';
      style = { background: 'var(--warning-dim)', color: 'var(--warning)' };
      break;
    case 'done':
      label = '完了';
      style = { background: 'var(--success-dim)', color: 'var(--success)' };
      break;
  }

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold font-num whitespace-nowrap"
      style={style}
    >
      {label}
    </span>
  );
}
