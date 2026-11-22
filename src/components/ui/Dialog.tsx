'use client';

/**
 * Dialog（PC 向けモーダル）。docs/DESIGN.md「Dialog / Drawer」。
 *
 * Animate UI（Base UI 版）の primitives/base/dialog を元にしたコピー所有の部品。
 * 退場アニメーションのために motion を使い、出入りは DESIGN.md の slide-up + fade-in に合わせている。
 * モバイルは Drawer を使う。両方を出し分けたいときは Modal を使う。
 */
import * as React from 'react';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { AnimatePresence, LazyMotion, MotionConfig, domAnimation, m, type HTMLMotionProps } from 'motion/react';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/utils/cn';

/** オーバーレイ全般の重なり順。画面内の独自モーダル（z-[290] 以下）より上、Dropdown・Toast（z-[500]）より下 */
const OVERLAY_Z = 'z-[400]';

const DialogOpenContext = React.createContext(false);

type DialogProps = DialogPrimitive.Root.Props;

function Dialog({ open: openProp, defaultOpen = false, onOpenChange, ...props }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = openProp ?? uncontrolledOpen;
  return (
    <DialogOpenContext.Provider value={isOpen}>
      <DialogPrimitive.Root
        data-slot="dialog"
        {...props}
        open={isOpen}
        onOpenChange={(next, details) => {
          setUncontrolledOpen(next);
          onOpenChange?.(next, details);
        }}
      />
    </DialogOpenContext.Provider>
  );
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** 開いている間だけポータルを描画し、閉じるときは中の motion 要素の退場を待ってから外す */
function DialogPortal({ children, ...props }: Omit<DialogPrimitive.Portal.Props, 'keepMounted'>) {
  const isOpen = React.useContext(DialogOpenContext);
  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPrimitive.Portal data-slot="dialog-portal" keepMounted {...props}>
          {/* reducedMotion="user": prefers-reduced-motion のとき移動を止めてフェードだけにする */}
          <LazyMotion features={domAnimation}>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
          </LazyMotion>
        </DialogPrimitive.Portal>
      )}
    </AnimatePresence>
  );
}

const EASE_OUT = [0, 0, 0.2, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

function DialogBackdrop({
  className,
  ...props
}: Omit<DialogPrimitive.Backdrop.Props, 'render' | 'className'> & HTMLMotionProps<'div'>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      render={
        <m.div
          key="dialog-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.25, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
          className={cn('fixed inset-0 bg-(--scrim)', OVERLAY_Z, className as string)}
          {...props}
        />
      }
    />
  );
}

type DialogPopupProps = Omit<DialogPrimitive.Popup.Props, 'render' | 'className'> &
  HTMLMotionProps<'div'> & { className?: string };

function DialogPopup({ initialFocus, finalFocus, className, ...props }: DialogPopupProps) {
  return (
    <DialogPrimitive.Popup
      initialFocus={initialFocus}
      finalFocus={finalFocus}
      render={
        <m.div
          key="dialog-popup"
          data-slot="dialog-popup"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15, ease: EASE_IN } }}
          className={className}
          {...props}
        />
      }
    />
  );
}

/** スクリム + 中央配置のカード。中身は DialogHeader / 本文 / DialogFooter を並べる */
function DialogContent({
  className,
  children,
  showCloseButton = false,
  ...props
}: DialogPopupProps & { showCloseButton?: boolean }) {
  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPrimitive.Viewport className={cn('fixed inset-0 flex items-center justify-center p-4', OVERLAY_Z)}>
        <DialogPopup
          className={cn(
            'relative flex max-h-full w-full max-w-[480px] flex-col rounded-lg border border-border bg-card text-text outline-none',
            className
          )}
          {...props}
        >
          {children as React.ReactNode}
          {showCloseButton && (
            <DialogPrimitive.Close
              aria-label="閉じる"
              className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-sm text-text-2 transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text"
            >
              <Icon name="close" size={18} />
            </DialogPrimitive.Close>
          )}
        </DialogPopup>
      </DialogPrimitive.Viewport>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-header" className={cn('flex shrink-0 flex-col gap-1.5 px-6 pt-6', className)} {...props} />;
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="dialog-body" className={cn('min-h-0 overflow-y-auto px-6 py-4 text-sm', className)} {...props} />;
}

/** 右寄せで「キャンセル（ghost）→ 主アクション（primary / danger）」の順に置く */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex shrink-0 flex-wrap justify-end gap-3 px-6 pb-6', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn('text-h2 text-text', className as string)} {...props} />;
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-text-2', className as string)}
      {...props}
    />
  );
}

interface DialogShellProps {
  /** Esc・スクリムのクリックで呼ばれる */
  onClose: () => void;
  /** スクリーンリーダー向けのダイアログ名 */
  label: string;
  /** カード（role="dialog" の要素）に付けるクラス */
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'data-testid'?: string;
}

/**
 * 独自レイアウトの大きいモーダル用の外枠。スクリム・フォーカストラップ・Esc・ポータル・スクロールロックだけを
 * 提供し、カードの寸法やドラッグ移動は呼び出し側が className / style で持つ。
 * マウント中は常に開いている前提（親が条件付きで描画する）。
 *
 * ponytail: モバイルも Drawer ではなく下寄せの Dialog にしている。全高の入力フォームは内部スクロールと
 * スワイプで閉じる操作が競合し、入力中の誤クローズを招くため。スワイプで閉じたい画面が出たら Drawer に載せ替える。
 */
function DialogShell({ onClose, label, className, style, children, ...rest }: DialogShellProps) {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            'fixed inset-0 bg-(--scrim) transition-opacity duration-(--duration-base) ease-out data-starting-style:opacity-0',
            'z-[290]'
          )}
        />
        <DialogPrimitive.Viewport className="fixed inset-0 z-[290] flex items-end justify-center md:items-center md:p-8">
          <DialogPrimitive.Popup
            aria-label={label}
            data-slot="dialog-shell"
            className={cn(
              'outline-none transition-opacity duration-(--duration-base) ease-out data-starting-style:opacity-0',
              className
            )}
            style={style}
            {...rest}
          >
            {children}
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogBackdrop,
  DialogPopup,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogShell,
};
