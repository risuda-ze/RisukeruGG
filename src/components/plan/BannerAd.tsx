interface BannerAdProps {
  plan: 'light' | 'party';
}

/** LIGHTプランユーザー向けバナー広告プレースホルダー（フェーズ2で実装） */
export function BannerAd({ plan }: BannerAdProps) {
  if (plan !== 'light') return null;

  return (
    <div
      className="h-16 w-full rounded-lg border border-dashed border-zinc-300 bg-zinc-50"
      aria-label="広告スペース"
      role="complementary"
    />
  );
}
