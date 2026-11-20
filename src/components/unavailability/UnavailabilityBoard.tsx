'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Input, fieldLabelClass } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { MemberDetail } from '@/components/unavailability/MemberDetail';
import { UnavailabilityGrid } from '@/components/unavailability/UnavailabilityGrid';
import type { PeriodFocus } from '@/components/unavailability/UnavailabilityGrid';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toJstDateString } from '@/lib/googleCalendar/export';
import { subscribeUnavailabilityMonth } from '@/lib/repositories/unavailability';
import { monthOf, storageWindow } from '@/lib/unavailability/range';
import { datesBetween, groupByMember, orderMembers } from '@/lib/unavailability/view';
import { useAuthStore } from '@/stores/auth';
import type { UnavailabilityMonth } from '@/types/unavailability';

/** 画面ヘルプに出す注意事項（UN-043）。入力の操作は、入力機能を足すときにここへ追記する */
const HELP_ITEMS = [
  '入力するのは「対応不可」の時間帯だけです。入力のない時間帯は対応可能とみなします。',
  '「未入力」のメンバーは、まだ一度も入力していません。いつでも空いているという意味ではありません。',
  '表示・保存されるのは前月 1 日〜翌月末日です。それより前のものは毎月 1 日に削除されます。',
  '入力できるのは翌月末日までです。',
  '対応不可とメモを入力できるのは本人だけです。チームのメンバー全員が見られます。',
  '予定の内容は入力しません。補足があるときはメモに書きます。',
  '× はその日に 1 時間でも対応不可があることを表します。日付の下の人数は、表示中のメンバーのうち対応不可がある人数です。',
  'セルを押すと、そのメンバーの詳細（時間帯とメモ）が開きます。',
];

/** チーム全員の 1 ヶ月分の購読。月ごとに 1 つ置き、足した月だけ購読が増える（UN-090） */
function MonthSubscription({
  teamId,
  month,
  onData,
  onError,
}: {
  teamId: string;
  month: string;
  onData: (month: string, docs: UnavailabilityMonth[]) => void;
  onError: (error: Error) => void;
}) {
  useEffect(
    () => subscribeUnavailabilityMonth(teamId, month, (docs) => onData(month, docs), onError),
    [teamId, month, onData, onError]
  );
  return null;
}

/**
 * 対応不可時間の画面本体。ヘッダー（検索条件）と一覧、メンバー詳細を持つ（UN-041）。
 * チームを切り替えたときは、呼び出し側が key で作り直す。
 */
export function UnavailabilityBoard({ teamId }: { teamId: string }) {
  const selfId = useAuthStore((s) => s.currentUser?.uid ?? null);
  const members = useAuthStore((s) => s.members);
  const isMobile = useMediaQuery(767);

  const [today] = useState(() => toJstDateString(new Date()));
  const dates = useMemo(() => {
    const { from, to } = storageWindow(today);
    return datesBetween(from, to);
  }, [today]);

  // 当月を先に購読し、前月・翌月は表示が近づいたときに足す
  const [months, setMonths] = useState(() => [monthOf(today)]);
  const [docsByMonth, setDocsByMonth] = useState<Record<string, UnavailabilityMonth[]>>({});
  const [error, setError] = useState<Error | null>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [focus, setFocus] = useState<PeriodFocus>({ from: '', to: '' });
  const [detail, setDetail] = useState<{ userId: string; date: string } | null>(null);

  const onData = useCallback(
    (month: string, docs: UnavailabilityMonth[]) =>
      setDocsByMonth((prev) => ({ ...prev, [month]: docs })),
    []
  );
  const onNeedMonths = useCallback(
    (needed: string[]) =>
      setMonths((prev) =>
        needed.every((m) => prev.includes(m)) ? prev : [...new Set([...prev, ...needed])]
      ),
    []
  );
  const onCellClick = useCallback(
    (userId: string, date: string) => setDetail({ userId, date }),
    []
  );

  const byMember = useMemo(() => groupByMember(Object.values(docsByMonth).flat()), [docsByMonth]);
  const loadedMonths = useMemo(() => new Set(Object.keys(docsByMonth)), [docsByMonth]);
  const shownMembers = useMemo(
    () => orderMembers(members, selfId, selected),
    [members, selfId, selected]
  );
  const detailMember = detail && members.find((m) => m.userId === detail.userId);

  const filtering = selected.size > 0 || focus.from !== '' || focus.to !== '';
  const toggleMember = (userId: string) => {
    const next = new Set(selected);
    if (!next.delete(userId)) next.add(userId);
    setSelected(next);
  };
  const clearFilter = () => {
    setSelected(new Set());
    setFocus({ from: '', to: '' });
  };
  const dateRange = { min: dates[0], max: dates[dates.length - 1] };

  return (
    <>
      {months.map((month) => (
        <MonthSubscription
          key={month}
          teamId={teamId}
          month={month}
          onData={onData}
          onError={setError}
        />
      ))}

      {/* ヘッダー（検索条件）。初期表示は折り畳む */}
      <div className="shrink-0 border-b border-border bg-surface px-4 md:px-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={filterOpen}
            aria-controls="un-filter"
            onClick={() => setFilterOpen((open) => !open)}
            className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-left text-sm font-semibold text-text-2 transition-colors duration-(--duration-fast) hover:text-text"
          >
            {/* 開閉の矢印は左端に置く */}
            <Icon name={filterOpen ? 'expand_less' : 'expand_more'} size={18} />
            <span>検索条件</span>
            {filtering && <Badge variant="info">指定中</Badge>}
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="ヘルプを表示"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-text-2 transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text"
          >
            <Icon name="help_outline" size={18} />
          </button>
        </div>
        {filterOpen && (
          <div id="un-filter" className="flex flex-col gap-4 pt-1 pb-4">
            <fieldset>
              <legend className={fieldLabelClass}>メンバー</legend>
              <div className="mt-1 flex flex-wrap gap-x-5">
                {orderMembers(members, selfId, new Set()).map((member) => (
                  <label
                    key={member.userId}
                    className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={selected.has(member.userId)}
                      onChange={() => toggleMember(member.userId)}
                    />
                    {member.displayName}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                id="un-filter-from"
                type="date"
                label="期間（開始日）"
                value={focus.from}
                onChange={(e) => setFocus({ ...focus, from: e.target.value })}
                {...dateRange}
              />
              <Input
                id="un-filter-to"
                type="date"
                label="期間（終了日）"
                value={focus.to}
                onChange={(e) => setFocus({ ...focus, to: e.target.value })}
                {...dateRange}
              />
              <Button variant="ghost" onClick={clearFilter}>
                条件を解除
              </Button>
            </div>
          </div>
        )}
      </div>

      {error ? (
        // 読み込めなかったときは一覧を出さない（空白＝対応可能と読ませない）
        <div
          role="alert"
          className="flex items-center gap-2 bg-danger-tint px-4 py-3 text-sm text-danger md:px-7"
        >
          <Icon name="warning" size={16} />
          <span>
            対応不可時間を読み込めませんでした。時間をおいてページを再読み込みしてください。
          </span>
        </div>
      ) : !loadedMonths.has(monthOf(today)) ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <UnavailabilityGrid
          // 縦横を入れ替えるときはスクロール方向が変わるため作り直す
          key={isMobile ? 'vertical' : 'horizontal'}
          dates={dates}
          today={today}
          members={shownMembers}
          selfId={selfId}
          byMember={byMember}
          loadedMonths={loadedMonths}
          vertical={isMobile}
          focus={focus}
          onNeedMonths={onNeedMonths}
          onCellClick={onCellClick}
        />
      )}

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="対応不可時間の使い方"
        footer={
          <Button variant="ghost" onClick={() => setHelpOpen(false)}>
            閉じる
          </Button>
        }
      >
        <ul data-testid="un-help" className="flex list-disc flex-col gap-2 pl-5 leading-relaxed">
          {HELP_ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Modal>

      {detail && detailMember && !error && (
        <MemberDetail
          // 別のセルから開き直したときは、表示位置を作り直す
          key={`${detail.userId}:${detail.date}`}
          member={detailMember}
          data={byMember.get(detail.userId)}
          dates={dates}
          today={today}
          initialDate={detail.date}
          loadedMonths={loadedMonths}
          onNeedMonths={onNeedMonths}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
