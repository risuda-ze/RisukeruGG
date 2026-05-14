/* LIGHTプランユーザー向けバナー広告プレースホルダー */

interface BannerAdProps {
  plan: 'light' | 'party';
}

export function BannerAd({ plan }: BannerAdProps) {
  if (plan !== 'light') return null;

  return (
    <div
      className="h-16 w-full rounded-[12px] border border-dashed border-border bg-surface/50"
      aria-label="広告スペース"
      role="complementary"
    />
  );
}
