/* 今日のタイムラインコンポーネント */

export interface TimelineTag {
  label: string;
  bgColor: string;
  textColor: string;
}

export interface TimelineItem {
  /** 表示時刻 例: "20:00" */
  time: string;
  title: string;
  tags: TimelineTag[];
  /** 左側カラーバー色 例: "var(--live)" */
  barColor: string;
  /** 補助テキスト */
  meta?: string;
}

export interface TodayTimelineProps {
  items: TimelineItem[];
}

export function TodayTimeline({ items }: TodayTimelineProps) {
  if (items.length === 0) {
    return (
      <p className="text-[12px] text-muted py-4 text-center">今日の予定はありません</p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-3 px-2 py-2 rounded-[8px] hover:bg-purple/7 transition-colors"
        >
          {/* 時刻 */}
          <span className="text-[11px] text-muted font-num shrink-0 w-10 pt-0.5">{item.time}</span>

          {/* カラーバー */}
          <div
            className="w-[3px] rounded-full shrink-0 mt-1 self-stretch min-h-[28px]"
            style={{ backgroundColor: item.barColor }}
            aria-hidden="true"
          />

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-text leading-snug">{item.title}</p>
            {item.meta && (
              <p className="text-[10px] text-muted mt-0.5">{item.meta}</p>
            )}
            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.map((tag, j) => (
                  <span
                    key={j}
                    className="text-[9px] font-bold rounded-full px-1.5 py-0.5 tracking-wide"
                    style={{ backgroundColor: tag.bgColor, color: tag.textColor }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
