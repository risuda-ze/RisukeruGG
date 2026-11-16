/* ダッシュボード統計カード — 数値を大きく強調表示 */

import { Card, type ColorFamily } from './Card';

export type StatColor = 'purple' | 'amber' | 'live' | 'green';

export interface StatCardProps {
  /** カード上部の小さいラベル */
  label: string;
  /** 大きく表示する値 */
  value: string | number;
  /** 配色。purple は通常カード、それ以外はカラーファミリーの specimen カード */
  color?: StatColor;
  /** 値下部の補助テキスト */
  sub?: string;
}

const FAMILY: Record<Exclude<StatColor, 'purple'>, { family: ColorFamily; text: string }> = {
  amber: { family: 'orange', text: 'text-orange-text' },
  live: { family: 'pink', text: 'text-pink-text' },
  green: { family: 'green', text: 'text-green-text' },
};

export function StatCard({ label, value, color = 'purple', sub }: StatCardProps) {
  const spec = color === 'purple' ? null : FAMILY[color];
  return (
    <Card variant={spec ? 'specimen' : 'default'} family={spec?.family} noPadding className="p-4">
      <p className="eyebrow mb-2 text-text-2">{label}</p>
      <p className={`font-num text-h1 font-medium ${spec?.text ?? 'text-text'}`}>{value}</p>
      {sub && <p className="mt-2 text-caption text-text-2">{sub}</p>}
    </Card>
  );
}
