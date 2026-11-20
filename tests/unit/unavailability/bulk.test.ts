import { describe, expect, it } from 'vitest';
import {
  clipToWindow,
  decodeCsv,
  expandRecurring,
  parseCsv,
  toCsv,
} from '@/lib/unavailability/bulk';
import { FULL_DAY_MASK, hoursToMask } from '@/lib/unavailability/mask';

const csv = (...lines: string[]) => lines.join('\n');
const errorsOf = (text: string) => {
  const result = parseCsv(text);
  return result.ok ? [] : result.errors;
};
const daysOf = (text: string) => {
  const result = parseCsv(text);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.days;
};

describe('parseCsv: 展開（UN-080, UN-081）', () => {
  it('時間帯の行を日マスクにする。同じ日の行は合わせる', () => {
    expect(
      daysOf(
        csv(
          'date,start,end',
          '2026-11-20,09:00,12:00',
          '2026-11-20,20:00,24:00',
          '2026-11-21,00:00,01:00'
        )
      )
    ).toEqual({
      '2026-11-20': hoursToMask(9, 12) | hoursToMask(20, 24),
      '2026-11-21': hoursToMask(0, 1),
    });
  });

  it('start と end が両方空の行は終日不可', () => {
    expect(daysOf(csv('date,start,end', '2026-11-20,,'))).toEqual({ '2026-11-20': FULL_DAY_MASK });
  });

  it('end が start より前の行は翌日へまたぐ（月またぎ・00:00 終わりを含む）', () => {
    expect(daysOf(csv('date,start,end', '2026-11-30,22:00,02:00'))).toEqual({
      '2026-11-30': hoursToMask(22, 24),
      '2026-12-01': hoursToMask(0, 2),
    });
    expect(daysOf(csv('date,start,end', '2026-11-20,22:00,00:00'))).toEqual({
      '2026-11-20': hoursToMask(22, 24),
    });
  });

  it('BOM・CRLF・セル前後の空白・空行・ヘッダーの大文字・1 桁の時を受け入れる', () => {
    expect(daysOf('﻿Date,Start,End\r\n\r\n 2026-11-20 , 9:00 , 12:00 \r\n,,\r\n')).toEqual({
      '2026-11-20': hoursToMask(9, 12),
    });
  });

  it('データ行が無ければ空（当月に対応不可が無いダウンロードの再取り込み）', () => {
    expect(daysOf('date,start,end\n')).toEqual({});
  });

  it('範囲外の日付は不正にしない（プレビューで切り捨てる。UN-086）', () => {
    expect(daysOf(csv('date,start,end', '2030-01-01,09:00,10:00'))).toEqual({
      '2030-01-01': hoursToMask(9, 10),
    });
  });
});

describe('parseCsv: 検証（UN-081, UN-082）', () => {
  it('ヘッダー行が違えば、それだけを報告する', () => {
    expect(errorsOf(csv('2026-11-20,09:00,12:00'))).toEqual([
      { line: 1, reason: '1 行目は date,start,end にしてください' },
    ]);
    expect(errorsOf('')).toEqual([{ line: 1, reason: '1 行目は date,start,end にしてください' }]);
  });

  it('不正な行をすべて、ファイルの行番号と理由つきで返す。1 行でも不正なら展開しない', () => {
    const result = parseCsv(
      csv(
        'date,start,end',
        '2026-11-20,09:00,12:00', // 2: 正しい
        '2026-11-20,09:00,09:00', // 3: 同じ時刻
        '2026-11-20,09:00,', // 4: 片方だけ空
        '2026-11-20,,12:00', // 5: 片方だけ空
        '2026-11-20,09:30,12:00', // 6: 1 時間刻みでない
        '2026-02-30,09:00,12:00', // 7: 存在しない日付
        '2026/11/20,09:00,12:00', // 8: 日付の形式
        '2026-11-20,09:00,25:00', // 9: 24:00 を超える
        '2026-11-20,24:00,02:00', // 10: start に 24:00
        '', // 11: 空行（数えるが検査しない）
        '2026-11-20,09:00', // 12: 列が足りない
        '2026-11-20,09:00,12:00,メモ' // 13: 列が多い
      )
    );
    expect(result).toEqual({
      ok: false,
      errors: [
        { line: 3, reason: 'start と end に同じ時刻は指定できません' },
        { line: 4, reason: 'start と end は両方指定するか、両方空（終日）にしてください' },
        { line: 5, reason: 'start と end は両方指定するか、両方空（終日）にしてください' },
        { line: 6, reason: 'start は 00:00〜23:00 の 1 時間刻み（HH:00）で指定してください' },
        { line: 7, reason: 'date は実在する日付を yyyy-mm-dd で指定してください' },
        { line: 8, reason: 'date は実在する日付を yyyy-mm-dd で指定してください' },
        { line: 9, reason: 'end は 00:00〜24:00 の 1 時間刻み（HH:00）で指定してください' },
        { line: 10, reason: 'start は 00:00〜23:00 の 1 時間刻み（HH:00）で指定してください' },
        { line: 12, reason: '列は date,start,end の 3 つにしてください' },
        { line: 13, reason: '列は date,start,end の 3 つにしてください' },
      ],
    });
  });
});

describe('decodeCsv（UN-082）', () => {
  const bytes = (...values: number[]) => new Uint8Array(values).buffer;

  it('UTF-8 を読む。BOM は取り除く', () => {
    expect(decodeCsv(new TextEncoder().encode('date,start,end\n').buffer)).toBe('date,start,end\n');
    expect(decodeCsv(bytes(0xef, 0xbb, 0xbf, 0x61))).toBe('a');
  });

  it('UTF-8 でない（Shift_JIS の「あ」）なら null', () => {
    expect(decodeCsv(bytes(0x82, 0xa0))).toBeNull();
  });
});

describe('toCsv（UN-084）', () => {
  const days = {
    '2026-11-20': hoursToMask(9, 12) | hoursToMask(20, 24),
    '2026-11-05': FULL_DAY_MASK,
    '2026-12-01': hoursToMask(0, 2), // 当月ではない
  };

  it('当月ぶんだけを日付順に、連続する時間を 1 行にまとめて、BOM 付きで出す', () => {
    expect(toCsv(days, '2026-11')).toBe(
      '﻿date,start,end\r\n2026-11-05,00:00,24:00\r\n2026-11-20,09:00,12:00\r\n2026-11-20,20:00,24:00\r\n'
    );
  });

  it('そのまま再取り込みすると同じ内容に戻る', () => {
    expect(daysOf(toCsv(days, '2026-11'))).toEqual({
      '2026-11-05': FULL_DAY_MASK,
      '2026-11-20': hoursToMask(9, 12) | hoursToMask(20, 24),
    });
    expect(daysOf(toCsv({}, '2026-11'))).toEqual({});
  });
});

describe('expandRecurring（UN-085）', () => {
  it('期間内の該当曜日（複数可）へ展開する。両端の日を含む', () => {
    // 2026-11-16（月）〜 11-27（金）の月・金 → 16・20・23・27
    expect(
      expandRecurring({ from: '2026-11-16', to: '2026-11-27', weekdays: [1, 5], start: 9, end: 12 })
    ).toEqual({
      '2026-11-16': hoursToMask(9, 12),
      '2026-11-20': hoursToMask(9, 12),
      '2026-11-23': hoursToMask(9, 12),
      '2026-11-27': hoursToMask(9, 12),
    });
  });

  it('終了時が開始時より前なら翌日へまたぐ。連日なら翌日ぶんと合わせる', () => {
    // 11-20（金）・11-21（土）の 22 時〜翌 2 時
    expect(
      expandRecurring({ from: '2026-11-20', to: '2026-11-21', weekdays: [5, 6], start: 22, end: 2 })
    ).toEqual({
      '2026-11-20': hoursToMask(22, 24),
      '2026-11-21': hoursToMask(0, 2) | hoursToMask(22, 24),
      '2026-11-22': hoursToMask(0, 2),
    });
  });

  it('該当する曜日が無ければ空', () => {
    expect(
      expandRecurring({ from: '2026-11-16', to: '2026-11-17', weekdays: [0], start: 9, end: 12 })
    ).toEqual({});
  });
});

describe('clipToWindow（UN-086）', () => {
  it('前月 1 日〜翌月末日の外を切り捨て、切り捨てた日数を返す', () => {
    expect(
      clipToWindow(
        {
          '2026-09-30': 1, // 範囲外
          '2026-10-01': 1,
          '2026-12-31': 1,
          '2027-01-01': 1, // 範囲外（翌月末日またぎで生じた翌日ぶんを含む）
        },
        '2026-11-20'
      )
    ).toEqual({ days: { '2026-10-01': 1, '2026-12-31': 1 }, dropped: 2 });
  });
});
