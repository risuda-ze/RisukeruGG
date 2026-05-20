'use client';

/** Date | null と date/time 2入力の変換を一元管理するコンポーネント。
 *  ChromeとEdgeでdatetime-localの表示書式が異なる問題を回避するため
 *  type="date" + type="time" の2 inputに分割している。
 */

interface DateTimeInputProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  /** true の場合は時刻 input を非表示（終日イベント） */
  allDay?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

const BASE_CLASS =
  'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple';

/** Date を "YYYY-MM-DD" に変換する */
function toDateString(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/** Date を "HH:mm" に変換する */
function toTimeString(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${mi}`;
}

/** "YYYY-MM-DD" と "HH:mm" を合成して Date を返す */
function toDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}`);
}

export function DateTimeInput({
  label,
  value,
  onChange,
  min,
  allDay = false,
  required,
  error,
  hint,
  className,
}: DateTimeInputProps) {
  const dateValue = value ? toDateString(value) : '';
  const timeValue = value ? toTimeString(value) : '';
  const minDate = min ? toDateString(min) : undefined;
  const minTime = min && value && toDateString(value) === toDateString(min)
    ? toTimeString(min)
    : undefined;

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    if (!newDate) {
      onChange(null);
      return;
    }
    const time = timeValue || '00:00';
    onChange(toDate(newDate, time));
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = e.target.value;
    if (!newTime) return;
    const date = dateValue || toDateString(new Date());
    onChange(toDate(date, newTime));
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-[12px] font-semibold text-muted">
        {label}
        {required && <span className="text-live ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="date"
          value={dateValue}
          min={minDate}
          required={required}
          onChange={handleDateChange}
          className={`${BASE_CLASS} flex-1 ${error ? 'border-live' : ''}`}
        />
        {!allDay && (
          <input
            type="time"
            value={timeValue}
            min={minTime}
            required={required}
            onChange={handleTimeChange}
            className={`${BASE_CLASS} w-[110px] ${error ? 'border-live' : ''}`}
          />
        )}
      </div>
      {hint && !error && <p className="text-[11px] text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-live">{error}</p>}
    </div>
  );
}
