'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** スイッチの左に出すラベル */
  label: string;
  className?: string;
}

/** ラベル付きのオン/オフ切替（Base UI Switch）。on は primary の塗り */
export function Switch({ checked, onCheckedChange, disabled, label, className }: SwitchProps) {
  return (
    <label
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-2.25 select-none has-data-disabled:cursor-not-allowed has-data-disabled:opacity-40',
        className
      )}
    >
      <span className="text-[0.84rem] font-semibold text-text-2">{label}</span>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative h-6 w-10.5 shrink-0 rounded-full border border-border bg-surface transition-colors duration-(--duration-base) ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand data-checked:border-primary data-checked:bg-primary"
      >
        <SwitchPrimitive.Thumb className="absolute top-0.5 left-0.5 size-4.5 rounded-full bg-text-muted transition-[translate,background-color] duration-(--duration-base) ease-spring data-checked:translate-x-4.5 data-checked:bg-text-on-primary" />
      </SwitchPrimitive.Root>
    </label>
  );
}
