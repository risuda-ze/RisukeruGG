import type { BadgeProps } from '@/components/ui/Badge';
import type { UserRole } from '@/types/entities';

export const ROLE_LABELS: Record<UserRole, string> = {
  operator: 'オペレーター',
  member: 'メンバー',
  rom: 'ROM専',
};

/** ロール別のバッジ配色（DESIGN.md Badge） */
export const ROLE_BADGE_VARIANT: Record<UserRole, NonNullable<BadgeProps['variant']>> = {
  operator: 'primary',
  member: 'warning',
  rom: 'neutral',
};

/** カードを使わないセクションの見出し（対応不可時間の画面と揃える） */
export const sectionTitleClass = 'eyebrow text-text-2';
