/* ダッシュボード統計カード — 数値を大きく強調表示 */

export type StatColor = 'purple' | 'amber' | 'live' | 'green';

export interface StatCardProps {
  /** カード上部の小さいラベル */
  label: string;
  /** 大きく表示する値 */
  value: string | number;
  /** 値テキストの色バリアント */
  color?: StatColor;
  /** 値下部の補助テキスト */
  sub?: string;
}

const colorClasses: Record<StatColor, string> = {
  purple: 'text-purple-l',
  amber:  'text-amber-l',
  live:   'text-live',
  green:  'text-green',
};

export function StatCard({ label, value, color = 'purple', sub }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg px-[18px] py-[16px]">
      <p className="text-[11px] text-muted mb-1.5 tracking-wide">{label}</p>
      <p className={`text-[26px] font-bold leading-none font-num ${colorClasses[color]}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted mt-1.5">{sub}</p>}
    </div>
  );
}
