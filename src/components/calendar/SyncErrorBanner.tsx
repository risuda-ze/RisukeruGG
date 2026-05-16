'use client';

import { Button } from '@/components/ui/Button';

interface SyncErrorBannerProps {
  error: string | null;
  onRetry: () => void;
  needsReauth?: boolean;
}

export function SyncErrorBanner({ error, onRetry, needsReauth }: SyncErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="flex items-center justify-between rounded-[12px] bg-live/10 border border-live/30 px-4 py-3 text-sm text-live mb-4">
      <span>{needsReauth ? 'Googleカレンダーの再認証が必要です' : `同期エラー: ${error}`}</span>
      <Button variant="danger" size="sm" onClick={onRetry}>
        {needsReauth ? '再認証する' : '再試行する'}
      </Button>
    </div>
  );
}
