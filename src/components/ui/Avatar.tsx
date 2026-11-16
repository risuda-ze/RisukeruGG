/* イニシャルまたは画像アバターコンポーネント */

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** 表示するイニシャル（1〜2文字）。src が指定されない場合に使用 */
  initials: string;
  /** アバター画像URL。指定された場合はイニシャルより優先して表示 */
  src?: string | null;
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
  sm: { wrap: 'w-6 h-6', text: 'text-[9px]' },
  md: { wrap: 'w-[34px] h-[34px]', text: 'text-[13px]' },
  lg: { wrap: 'w-[42px] h-[42px]', text: 'text-[15px]' },
};

export function Avatar({
  initials,
  src,
  bgClass = 'bg-surface-2',
  textClass = 'text-text',
  size = 'md',
  online,
}: AvatarProps) {
  const { wrap, text } = sizeClasses[size];
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border-2 border-border ${wrap} ${bgClass}`}
    >
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={initials} className="w-full h-full object-cover rounded-full" />
      ) : (
        <span className={`font-semibold leading-none select-none ${text} ${textClass}`}>
          {initials.slice(0, 2).toUpperCase()}
        </span>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 w-[9px] h-[9px] rounded-full bg-success border-2 border-card z-10"
          aria-label="オンライン"
        />
      )}
    </div>
  );
}
