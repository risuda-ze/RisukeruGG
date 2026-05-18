'use client';

/** Date | null と datetime-local 文字列の変換を一元管理する入力コンポーネント */

interface DateTimeInputProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  min?: Date;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

const BASE_CLASS =
  'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple';

/** Date を datetime-local 入力値（YYYY-MM-DDTHH:mm）に変換する */
function toLocalString(date: Date): string {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export function DateTimeInput({
  label,
  value,
  onChange,
  min,
  required,
  error,
  hint,
  className,
}: DateTimeInputProps) {
  const inputValue = value ? toLocalString(value) : '';
  const minValue = min ? toLocalString(min) : undefined;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    if (!raw) {
      onChange(null);
      return;
    }
    // datetime-local の値はローカルタイムとして解釈する
    onChange(new Date(raw));
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-[12px] font-semibold text-muted">
        {label}
        {required && <span className="text-live ml-0.5">*</span>}
      </label>
      <input
        type="datetime-local"
        value={inputValue}
        min={minValue}
        required={required}
        onChange={handleChange}
        className={`${BASE_CLASS} ${error ? 'border-live' : ''}`}
      />
      {hint && !error && <p className="text-[11px] text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-live">{error}</p>}
    </div>
  );
}
