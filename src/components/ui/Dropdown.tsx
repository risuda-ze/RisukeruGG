'use client';

import { useState, useRef, useEffect } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps {
  options: DropdownOption[];
  value?: string | null;
  placeholder?: string;
  size?: 'sm' | 'md';
  /** メニューの水平方向 */
  align?: 'left' | 'right';
  /** 上方向に展開 */
  up?: boolean;
  /** スクロール（max-height: 188px） */
  scroll?: boolean;
  /** 先頭に表示するアイコン */
  icon?: IconName;
  disabled?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export function Dropdown({
  options,
  value,
  placeholder = '選択…',
  size = 'md',
  align = 'left',
  up,
  scroll,
  icon,
  disabled,
  onChange,
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find((o) => o.value === value) ?? null;

  const choose = (opt: DropdownOption) => {
    setOpen(false);
    onChange?.(opt.value);
  };

  const menuCls = ['dropdown__menu'];
  if (align === 'right') menuCls.push('dropdown__menu--right');
  if (up) menuCls.push('dropdown__menu--up');
  if (scroll) menuCls.push('dropdown__menu--scroll');

  return (
    <div className={`dropdown ${className}`} ref={ref}>
      <button
        type="button"
        className={[
          'dropdown__trigger',
          size === 'sm' ? 'dropdown__trigger--sm' : '',
          open ? 'is-open' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
      >
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: selected ? 'var(--text-primary)' : 'var(--text-muted)',
            minWidth: 0,
          }}
        >
          {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <Icon name="chevron_down" size={size === 'sm' ? 15 : 17} className="ic" />
      </button>

      {open && (
        <div className={menuCls.join(' ')}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dropdown__item${opt.value === value ? ' is-active' : ''}`}
              onClick={() => choose(opt)}
            >
              <span>{opt.label}</span>
              {opt.value === value && (
                <Icon name="check" size={15} className="ic dropdown__check" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
