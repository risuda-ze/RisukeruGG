interface LiveBadgeProps {
  status: string;
}

/** LIVE中のスケジュールに赤バッジ+パルスアニメーションを表示する */
export function LiveBadge({ status }: LiveBadgeProps) {
  if (status !== 'live') return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
      LIVE
    </span>
  );
}
