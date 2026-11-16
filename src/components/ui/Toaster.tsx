'use client';

/**
 * Toast（sonner）。docs/DESIGN.md「Toast」: card 面 + 左 3px のステータス色レール + radius-lg。
 * 表示は `import { toast } from 'sonner'` の toast.success() / toast.error() などで行う。
 */
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Icon } from '@/components/ui/Icon';

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      className="z-[500]"
      icons={{
        success: <Icon name="check" size={16} className="text-success" />,
        error: <Icon name="warning" size={16} className="text-danger" />,
        warning: <Icon name="warning" size={16} className="text-warning" />,
        info: <Icon name="info" size={16} className="text-info" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex w-(--width) items-start gap-2.5 rounded-lg border border-l-[3px] border-border border-l-border-strong bg-card px-4 py-3 text-sm text-text',
          title: 'font-semibold',
          description: 'text-text-2',
          icon: 'mt-0.5 shrink-0',
          success: 'border-l-success',
          error: 'border-l-danger',
          warning: 'border-l-warning',
          info: 'border-l-info',
        },
      }}
      {...props}
    />
  );
}
