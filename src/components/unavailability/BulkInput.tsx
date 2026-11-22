'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { badgeVariants } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { Input, fieldLabelClass } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { END_OPTIONS, START_OPTIONS } from '@/components/unavailability/NoteForm';
import { mergeUnavailabilityMonth } from '@/lib/repositories/unavailability';
import {
  clipToWindow,
  decodeCsv,
  expandRecurring,
  parseCsv,
  toCsv,
} from '@/lib/unavailability/bulk';
import type { CsvError } from '@/lib/unavailability/bulk';
import { maskToRanges } from '@/lib/unavailability/mask';
import { groupByMonth, monthOf } from '@/lib/unavailability/range';
import { dayLabel } from '@/lib/unavailability/view';
import { cn } from '@/lib/utils/cn';
import type { DayMasks } from '@/types/unavailability';

interface BulkInputProps {
  teamId: string;
  userId: string;
  today: string;
  /** 保存済みの自分の対応不可（CSV ダウンロード用） */
  savedDays: DayMasks;
  onClose: () => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
/** 定期入力の期間の上限（日数）。保存できる範囲は最大 3 ヶ月なので、これを超える指定は誤りとして弾く */
const MAX_SPAN_DAYS = 366;
/** エラー一覧に出す行数の上限。超えた分は件数だけ示す */
const MAX_ERRORS_SHOWN = 50;
const hh = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** プレビューに出す内容（範囲外を切り捨てた後） */
interface Preview {
  source: string;
  days: DayMasks;
  dropped: number;
}

/**
 * CSV・定期入力（UN-080〜UN-087）。どちらも「展開 → プレビュー → 和集合で保存」の同じ経路を通す。
 * 保存は既存の対応不可に追記するだけで、既存の対応不可とメモは消さない。
 */
export function BulkInput({ teamId, userId, today, savedDays, onClose }: BulkInputProps) {
  const [tab, setTab] = useState<'recurring' | 'csv'>('recurring');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [saving, setSaving] = useState(false);

  // 定期入力
  const [pattern, setPattern] = useState({
    from: today,
    to: today,
    weekdays: [] as number[],
    start: 9,
    end: 10,
  });
  const [patternError, setPatternError] = useState<string | null>(null);
  /** 入力を変えたら、前回の検証エラーは消す */
  const changePattern = (next: typeof pattern) => {
    setPattern(next);
    setPatternError(null);
  };

  // CSV
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvErrors, setCsvErrors] = useState<CsvError[] | null>(null);
  const [csvFailure, setCsvFailure] = useState<string | null>(null);

  const showPreview = (source: string, expanded: DayMasks) =>
    setPreview({ source, ...clipToWindow(expanded, today) });

  const previewRecurring = () => {
    const { from, to, weekdays, start, end } = pattern;
    const spanDays = (Date.parse(to) - Date.parse(from)) / (24 * 60 * 60 * 1000);
    const error =
      from === '' || to === ''
        ? '開始日と終了日を指定してください'
        : from > to
          ? '終了日は開始日以降にしてください'
          : spanDays > MAX_SPAN_DAYS
            ? '期間は 1 年以内で指定してください'
            : weekdays.length === 0
              ? '曜日を 1 つ以上選んでください'
              : start === end
                ? '開始と終了に同じ時刻は指定できません'
                : null;
    setPatternError(error);
    if (!error) showPreview('定期入力', expandRecurring(pattern));
  };

  const readCsv = async (file: File) => {
    setFileName(file.name);
    setCsvErrors(null);
    setCsvFailure(null);
    // 読み込みはブラウザ内で行う（サーバーへ送らない）
    const text = decodeCsv(await file.arrayBuffer());
    if (text === null) {
      setCsvFailure(
        '文字コードが UTF-8 ではないため、取り込めません。UTF-8 で保存し直してください。'
      );
      return;
    }
    const result = parseCsv(text);
    if (result.ok) showPreview(`CSV（${file.name}）`, result.days);
    else setCsvErrors(result.errors);
  };

  const download = () => {
    const month = monthOf(today);
    const url = URL.createObjectURL(
      new Blob([toCsv(savedDays, month)], { type: 'text/csv;charset=utf-8' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `unavailability_${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dates = Object.keys(preview?.days ?? {}).sort();

  const save = async () => {
    if (!preview) return;
    const byMonth = Object.entries(groupByMonth(preview.days));
    setSaving(true);
    const results = await Promise.allSettled(
      byMonth.map(([month, days]) => mergeUnavailabilityMonth(teamId, userId, month, days))
    );
    setSaving(false);
    const failed = byMonth
      .filter((_, i) => results[i].status === 'rejected')
      .map(([month]) => month);
    if (failed.length === 0) {
      toast.success(`${dates.length} 日分の対応不可を保存しました`);
      onClose();
      return;
    }
    // 失敗した月を示し、プレビューを残してやり直せるようにする（保存できた月を再度保存しても結果は変わらない）
    toast.error(`${failed.join('・')} の保存に失敗しました。もう一度お試しください。`);
  };

  if (preview) {
    return (
      <Modal
        open
        onClose={saving ? () => {} : onClose}
        title="取り込み内容の確認"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)} disabled={saving}>
              戻る
            </Button>
            <Button onClick={save} disabled={dates.length === 0} loading={saving}>
              保存
            </Button>
          </>
        }
      >
        <div data-testid="un-bulk-preview" className="flex flex-col gap-3">
          <p>
            {preview.source}から、<span className="font-num font-bold">{dates.length}</span>{' '}
            日分の対応不可を追加します。すでに入力済みの対応不可とメモは変わりません。
          </p>
          {preview.dropped > 0 && (
            <p data-testid="un-bulk-dropped" className="text-caption text-warning">
              前月 1 日〜翌月末日の外にある {preview.dropped}{' '}
              日分は、保存できないため取り除きました。
            </p>
          )}
          {dates.length === 0 ? (
            <p className="text-caption text-text-muted">追加する対応不可がありません。</p>
          ) : (
            // 対象日が多いときは、この一覧だけを縦スクロールする
            <ul className="max-h-64 overflow-y-auto rounded-sm border border-border">
              {dates.map((date) => {
                const { md, weekday } = dayLabel(date);
                return (
                  <li
                    key={date}
                    data-testid="un-bulk-day"
                    data-date={date}
                    className="font-num flex gap-3 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <span className="w-24 shrink-0 text-text">
                      {md}（{weekday}）
                    </span>
                    <span className="text-text-2">
                      {maskToRanges(preview.days[date])
                        .map(({ start, end }) => `${hh(start)}〜${hh(end)}`)
                        .join('、')}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="CSV・定期入力"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            閉じる
          </Button>
          {tab === 'recurring' && <Button onClick={previewRecurring}>プレビュー</Button>}
        </>
      }
    >
      <div data-testid="un-bulk" className="flex flex-col gap-4">
        <div
          role="tablist"
          className="inline-flex gap-0.5 self-start rounded-md border border-border bg-surface p-0.75"
        >
          {(['recurring', 'csv'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cn(
                'min-h-11 cursor-pointer rounded-sm px-4 text-sm font-semibold transition-colors duration-(--duration-fast) ease-out',
                tab === value
                  ? 'bg-primary text-text-on-primary'
                  : 'text-text-2 hover:bg-surface-2 hover:text-text'
              )}
            >
              {value === 'recurring' ? '定期入力' : 'CSV'}
            </button>
          ))}
        </div>

        {tab === 'recurring' && (
          <div className="flex flex-col gap-4">
            <p className="text-caption text-text-muted">
              期間内の選んだ曜日に、同じ時間帯の対応不可をまとめて追加します。入力した内容は一度だけ展開され、繰り返しの設定としては残りません。
            </p>
            <div className="flex flex-wrap gap-3">
              <Input
                id="un-bulk-from"
                type="date"
                label="開始日"
                value={pattern.from}
                onChange={(e) => changePattern({ ...pattern, from: e.target.value })}
              />
              <Input
                id="un-bulk-to"
                type="date"
                label="終了日"
                value={pattern.to}
                onChange={(e) => changePattern({ ...pattern, to: e.target.value })}
              />
            </div>
            <fieldset>
              <legend className={fieldLabelClass}>曜日</legend>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {WEEKDAYS.map((label, weekday) => {
                  const on = pattern.weekdays.includes(weekday);
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={on}
                      aria-label={`${label}曜日`}
                      onClick={() =>
                        changePattern({
                          ...pattern,
                          weekdays: on
                            ? pattern.weekdays.filter((w) => w !== weekday)
                            : [...pattern.weekdays, weekday],
                        })
                      }
                      className={cn(
                        badgeVariants({ variant: on ? 'primary' : 'neutral' }),
                        'size-11 cursor-pointer justify-center px-0'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-end gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className={fieldLabelClass}>開始</span>
                  <Dropdown
                    options={START_OPTIONS}
                    value={String(pattern.start)}
                    onChange={(value) => changePattern({ ...pattern, start: Number(value) })}
                    scroll
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className={fieldLabelClass}>終了</span>
                  <Dropdown
                    options={END_OPTIONS}
                    value={String(pattern.end)}
                    onChange={(value) => changePattern({ ...pattern, end: Number(value) })}
                    scroll
                  />
                </label>
              </div>
              <p className="text-caption text-text-muted">
                終了が開始より前のときは、翌日までの時間帯として扱います（例: 22:00〜02:00）。
              </p>
            </div>
            {patternError && (
              <p role="alert" className="text-caption text-danger">
                {patternError}
              </p>
            )}
          </div>
        )}

        {tab === 'csv' && (
          <div className="flex flex-col gap-4">
            <div className="text-caption flex flex-col gap-1 text-text-muted">
              <p>
                1 行目を <code className="font-num text-text">date,start,end</code> とし、2
                行目以降に <code className="font-num text-text">2026-11-20,09:00,12:00</code>{' '}
                の形で書きます（文字コードは UTF-8）。
              </p>
              <p>
                start と end を両方空にすると終日、end が start
                より前だと翌日までの時間帯になります。取り込みは追記で、入力済みの対応不可は消えません。
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* ファイル選択はネイティブの入力を label で包んで、ボタンの見た目にする */}
              <label
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand'
                )}
              >
                <Icon name="add" size={16} />
                CSV ファイルを選ぶ
                <input
                  data-testid="un-bulk-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    // 同じファイルを選び直しても読み込めるよう、選択を空に戻す
                    e.target.value = '';
                    if (file) void readCsv(file);
                  }}
                />
              </label>
              <Button variant="subtle" onClick={download} className="px-4">
                <Icon name="arrow_downward" size={16} />
                当月の CSV をダウンロード
              </Button>
            </div>
            {csvFailure && (
              <p
                role="alert"
                data-testid="un-bulk-csv-failure"
                className="text-caption text-danger"
              >
                {fileName}: {csvFailure}
              </p>
            )}
            {csvErrors && (
              <div role="alert" data-testid="un-bulk-csv-errors" className="flex flex-col gap-1.5">
                <p className="text-caption text-danger">
                  {fileName}: {csvErrors.length}{' '}
                  行に誤りがあるため、取り込みませんでした。直してからもう一度選んでください。
                </p>
                {/* 件数が多いときは、この一覧だけを縦スクロールし、先頭の一定数だけ出す */}
                <ul className="text-caption max-h-48 overflow-y-auto rounded-sm border border-border">
                  {csvErrors.slice(0, MAX_ERRORS_SHOWN).map(({ line, reason }) => (
                    <li
                      key={line}
                      className="flex gap-3 border-b border-border px-3 py-1.5 last:border-b-0"
                    >
                      <span className="font-num w-14 shrink-0 text-text">{line} 行目</span>
                      <span className="text-text-2">{reason}</span>
                    </li>
                  ))}
                </ul>
                {csvErrors.length > MAX_ERRORS_SHOWN && (
                  <p className="text-caption text-text-muted">
                    ほか {csvErrors.length - MAX_ERRORS_SHOWN} 行（先頭 {MAX_ERRORS_SHOWN}{' '}
                    行を表示）
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
