/* LIVE中バッジ — パルスアニメーション付き */

interface LiveBadgeProps {
  status: string;
}

export function LiveBadge({ status }: LiveBadgeProps) {
  if (status !== 'live') return null;

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-live/15 border border-live/40 px-2.5 py-0.5 text-xs font-bold text-live">
      <span className="h-1.5 w-1.5 rounded-full bg-live animate-live-pulse" aria-hidden="true" />
      LIVE
    </span>
  );
}
