'use client';

import { Select } from '@base-ui/react/select';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/utils';

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

/** 単一選択のドロップダウン。Base UI の Select（キーボード操作・先行入力・ポータル描画）に載せている */
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
  className,
}: DropdownProps) {
  const iconSize = size === 'sm' ? 15 : 17;
  return (
    <Select.Root
      items={options}
      value={value ?? null}
      onValueChange={(next) => {
        if (next != null) onChange?.(next);
      }}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        data-slot="dropdown-trigger"
        className={cn(
          'group flex w-full cursor-pointer items-center justify-between gap-2 rounded-sm border border-border bg-card text-left font-medium whitespace-nowrap text-text outline-none transition-colors duration-(--duration-fast) ease-out hover:bg-surface focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/25 data-disabled:cursor-not-allowed data-disabled:opacity-40 data-popup-open:border-brand',
          size === 'sm' ? 'h-9 pr-2 pl-3 text-[0.8125rem]' : 'h-11 pr-3 pl-3.5 text-sm',
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2 group-data-placeholder:text-text-muted">
          {icon && <Icon name={icon} size={iconSize} />}
          <Select.Value placeholder={placeholder} className="truncate" />
        </span>
        <Select.Icon className="flex shrink-0 text-text-muted transition-transform duration-(--duration-fast) ease-out group-data-popup-open:rotate-180">
          <Icon name="chevron_down" size={iconSize} />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          side={up ? 'top' : 'bottom'}
          align={align === 'right' ? 'end' : 'start'}
          sideOffset={6}
          alignItemWithTrigger={false}
          className="z-[500]"
        >
          <Select.Popup
            data-slot="dropdown-menu"
            className={cn(
              'min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-md border border-border bg-card p-1.5 text-text outline-none transition-[opacity,transform] duration-(--duration-base) ease-out data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0',
              scroll ? 'max-h-[188px]' : 'max-h-(--available-height)'
            )}
          >
            <Select.List className="flex flex-col gap-0.5">
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={opt.value}
                  className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-[0.875rem] whitespace-nowrap text-text-2 outline-none select-none data-highlighted:bg-surface data-highlighted:text-text data-selected:font-semibold data-selected:text-text"
                >
                  <Select.ItemText>{opt.label}</Select.ItemText>
                  <Select.ItemIndicator className="ml-auto flex">
                    <Icon name="check" size={15} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
