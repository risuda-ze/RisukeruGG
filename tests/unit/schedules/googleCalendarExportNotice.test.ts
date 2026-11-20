import { describe, expect, it } from 'vitest';

import { describeExportNotice } from '@/components/calendar/GoogleCalendarExportNotice';

describe('describeExportNotice（書き出し結果の文言と再実行の可否）', () => {
  it('完了時は書き出し先と追加・更新・削除の件数を出し、再実行は出さない', () => {
    const view = describeExportNotice({
      kind: 'success',
      calendarName: 'RisukeruGG - サンプルチーム',
      added: 12,
      updated: 3,
      deleted: 1,
    });
    expect(view.message).toBe(
      'Google カレンダー「RisukeruGG - サンプルチーム」に書き出しました（追加 12・更新 3・削除 1）'
    );
    expect(view.retry).toBe(false);
  });

  it('一部失敗時は失敗件数と再実行を出す', () => {
    const view = describeExportNotice({ kind: 'partial', total: 16, failed: 2 });
    expect(view.message).toBe('16 件中 2 件を書き出せませんでした。もう一度お試しください。');
    expect(view.retry).toBe(true);
  });

  it('同意の拒否は中止した旨を出し、再実行は出さない', () => {
    const view = describeExportNotice({ kind: 'error', reason: 'denied', email: 'a@example.com' });
    expect(view.message).toContain('書き出しを中止しました');
    expect(view.retry).toBe(false);
  });

  it('別アカウントを選んだ場合はログイン中のアカウントを示す', () => {
    const view = describeExportNotice({
      kind: 'error',
      reason: 'account_mismatch',
      email: 'sample@example.com',
    });
    expect(view.message).toContain('ログイン中のアカウント（sample@example.com）とは別の');
    expect(view.retry).toBe(false);
  });

  it.each(['failed', 'popup_blocked'] as const)('%s は再実行を出す', (reason) => {
    expect(describeExportNotice({ kind: 'error', reason, email: null }).retry).toBe(true);
  });
});
