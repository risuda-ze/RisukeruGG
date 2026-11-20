import { MEMBER_DUTY_LABELS } from '@/types/entities';
import type { MemberDuty } from '@/types/entities';

/** 担当分野の Tag 表示（TE-014。DESIGN.md Badge / Tag の Tag） */
export function DutyChips({ duties }: { duties: MemberDuty[] }) {
  if (duties.length === 0) return null;
  return (
    <ul aria-label="担当分野" className="flex flex-wrap gap-1">
      {duties.map((d) => (
        <li
          key={d}
          className="text-caption rounded-sm border border-blue-border bg-blue-tint px-2 py-0.5 text-blue-text"
        >
          {MEMBER_DUTY_LABELS[d]}
        </li>
      ))}
    </ul>
  );
}
