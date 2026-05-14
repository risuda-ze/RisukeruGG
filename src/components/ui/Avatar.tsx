/* イニシャル表示アバターコンポーネント */

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** 表示するイニシャル（1〜2文字） */
  initials: string;
  /** 背景色クラス（Tailwind、例: "bg-purple-d/30"） */
  bgClass?: string;
  /** テキスト色クラス（Tailwind、例: "text-purple-l"） */
  textClass?: string;
  /** アバターサイズ */
  size?: AvatarSize;
  /** オンライン状態インジケータ表示 */
  online?: boolean;
}

const sizeClasses: Record<AvatarSize, { wrap: string; text: string }> = {
  sm: { wrap: 'w-6 h-6',   text: 'text-[9px]'  },
  md: { wrap: 'w-[34px] h-[34px]', text: 'text-[13px]' },
  lg: { wrap: 'w-[42px] h-[42px]', text: 'text-[15px]' },
};

export function Avatar({
  initials,
  bgClass = 'bg-purple-d/30',
  textClass = 'text-purple-l',
  size = 'md',
  online,
}: AvatarProps) {
  const { wrap, text } = sizeClasses[size];
  return (
    <div className={`relative inline-flex items-center justify-center rounded-full shrink-0 ${wrap} ${bgClass}`}>
      <span className={`font-semibold leading-none select-none ${text} ${textClass}`}>
        {initials.slice(0, 2).toUpperCase()}
      </span>
      {online && (
        <span
          className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-green border-2 border-surface"
          aria-label="オンライン"
        />
      )}
    </div>
  );
}
