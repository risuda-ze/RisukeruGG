'use client';

import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';
import type { ExportNotice } from '@/lib/googleCalendar/run';

interface GoogleCalendarExportNoticeProps {
  notice: ExportNotice;
  onDismiss: () => void;
  onRetry: () => void;
}

/** 通知ごとの見た目・文言・再実行の可否 */
export function describeExportNotice(notice: ExportNotice): {
  tone: string;
  icon: 'check' | 'warning';
  message: string;
  retry: boolean;
} {
  if (notice.kind === 'success') {
    return {
      tone: 'bg-success-tint text-success',
      icon: 'check',
      message: `Google カレンダー「${notice.calendarName}」に書き出しました（追加 ${notice.added}・更新 ${notice.updated}・削除 ${notice.deleted}）`,
      retry: false,
    };
  }
  if (notice.kind === 'partial') {
    return {
      tone: 'bg-warning-tint text-warning',
      icon: 'warning',
      message: `${notice.total} 件中 ${notice.failed} 件を書き出せませんでした。もう一度お試しください。`,
      retry: true,
    };
  }
  const tone = 'bg-danger-tint text-danger';
  switch (notice.reason) {
    case 'denied':
      return {
        tone,
        icon: 'warning',
        message: 'Google カレンダーへのアクセスが許可されなかったため、書き出しを中止しました。',
        retry: false,
      };
    case 'account_mismatch':
      return {
        tone,
        icon: 'warning',
        message: `ログイン中のアカウント${notice.email ? `（${notice.email}）` : ''}とは別の Google アカウントが選ばれました。同じアカウントでやり直してください。`,
        retry: false,
      };
    case 'popup_blocked':
      return {
        tone,
        icon: 'warning',
        message:
          'ポップアップがブロックされました。ブラウザでポップアップを許可してから、もう一度お試しください。',
        retry: true,
      };
    case 'failed':
      return {
        tone,
        icon: 'warning',
        message:
          'Google カレンダーへの書き出しに失敗しました。時間をおいてもう一度お試しください。',
        retry: true,
      };
  }
}

/** Google カレンダー書き出しの結果バナー（カレンダーヘッダー直下に出す。SC-008-1） */
export function GoogleCalendarExportNotice({
  notice,
  onDismiss,
  onRetry,
}: GoogleCalendarExportNoticeProps) {
  const { tone, icon, message, retry } = describeExportNotice(notice);
  return (
    <div
      data-slot="gcal-export-notice"
      role={notice.kind === 'success' ? 'status' : 'alert'}
      className={cn(
        'flex shrink-0 items-center gap-2 border-b border-border px-4 py-1 text-[0.8125rem] md:px-7',
        tone
      )}
    >
      <Icon name={icon} size={16} />
      <span className="flex-1 py-1.5">{message}</span>
      {retry && (
        <button onClick={onRetry} className="flex h-11 shrink-0 cursor-pointer items-center">
          <span className="rounded-lg border-[1.5px] border-current px-3 py-1 text-[0.75rem] font-semibold">
            再実行
          </span>
        </button>
      )}
      <button
        onClick={onDismiss}
        aria-label="通知を閉じる"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
