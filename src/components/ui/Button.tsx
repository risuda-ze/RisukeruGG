'use client';

import { ButtonHTMLAttributes, Ref } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * ボタンの見た目。<Link> などボタン以外の要素にも
 * `className={buttonVariants({ variant, size })}` で同じ見た目を当てられる。
 * 規約: docs/DESIGN.md「Button」。塗りは primary と danger だけ。
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] border-transparent font-semibold leading-none whitespace-nowrap no-underline select-none transition-[background-color,border-color,color,transform,filter] duration-(--duration-instant) ease-snap active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-text-on-primary hover:bg-primary-hover active:bg-primary-active',
        // 2次アクション（キャンセル等）。secondary は ghost の別名
        ghost: 'border-border-strong bg-transparent text-text hover:bg-surface',
        secondary: 'border-border-strong bg-transparent text-text hover:bg-surface',
        subtle: 'bg-surface text-text hover:bg-surface-2',
        danger: 'bg-danger text-text-on-danger hover:brightness-90',
        link: 'h-auto rounded-sm px-0 text-brand-2 underline-offset-4 hover:underline',
        // 塗りにしない。ファミリーの tint + border で表す
        amber: 'border-orange-border bg-orange-tint text-orange-text hover:brightness-110',
        success: 'border-green-border bg-green-tint text-green-text hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-4 text-[0.8125rem]',
        md: 'h-11 px-6 text-[0.9375rem]',
        lg: 'h-13 px-8 text-[1.0625rem]',
        icon: 'size-11 px-0',
        'icon-sm': 'size-9 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

// ponytail: Base UI の Button は type="button" を既定にするため、暗黙の submit に頼る
// 既存フォームを壊さないよう素の <button> を使う。render 差し替えが必要になったら置き換える
export function Button({ variant, size, loading = false, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      data-slot="button"
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
