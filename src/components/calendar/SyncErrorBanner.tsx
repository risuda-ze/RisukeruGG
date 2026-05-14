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
    <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>
        {needsReauth
          ? 'Googleカレンダーの再認証が必要です'
          : `同期エラー: ${error}`}
      </span>
      <Button variant="ghost" size="sm" onClick={onRetry} className="text-red-700 hover:bg-red-100">
        {needsReauth ? '再認証する' : '再試行する'}
      </Button>
    </div>
  );
}
