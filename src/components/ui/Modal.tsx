'use client';

import { ReactNode } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer';

export interface ModalProps {
  /** モーダル表示フラグ */
  open: boolean;
  /** 閉じるコールバック（Escキー・スクリムのクリック・スワイプ） */
  onClose: () => void;
  /** モーダルタイトル */
  title?: string;
  children: ReactNode;
  /** フッターエリア（キャンセル → 主アクションの順） */
  footer?: ReactNode;
  /** モーダルサイズ（PC のみ。モバイルは全幅のボトムシート） */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-[360px]',
  md: 'max-w-[480px]',
  lg: 'max-w-[640px]',
  xl: 'max-w-[760px]',
};

/** 標準モーダル。PC（md 以上）は Dialog、モバイルは下からの Drawer で表示する */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const isMobile = useMediaQuery(767);
  const onOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
        <DrawerContent aria-label={title}>
          {title && (
            <DrawerHeader>
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <DrawerBody>{children}</DrawerBody>
          {footer && <DrawerFooter>{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={sizeClasses[size]} aria-label={title}>
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        <DialogBody className={footer ? undefined : 'pb-6'}>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
