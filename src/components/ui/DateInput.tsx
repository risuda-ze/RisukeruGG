'use client';

/** date 専用の入力コンポーネント（DateTimeInput の date 版） */

interface DateInputProps {
  label: string;
  value: string; // "yyyy-MM-dd"
  onChange: (value: string) => void;
  min?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

const BASE_CLASS =
  'w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple';

export function DateInput({
  label,
  value,
  onChange,
  min,
  required,
  error,
  hint,
  className,
}: DateInputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="text-[12px] font-semibold text-muted">
        {label}
        {required && <span className="text-live ml-0.5">*</span>}
      </label>
      <input
        type="date"
        value={value}
        min={min}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={`${BASE_CLASS} ${error ? 'border-live' : ''}`}
      />
      {hint && !error && <p className="text-[11px] text-muted">{hint}</p>}
      {error && <p className="text-[11px] text-live">{error}</p>}
    </div>
  );
}
