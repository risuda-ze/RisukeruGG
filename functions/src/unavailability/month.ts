const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 月次削除のしきい値。この月（`yyyy-mm`）より前の月ドキュメントを消す。
 * 保存するのは JST の前月・当月・翌月なので、しきい値は前月。
 */
export function purgeBeforeMonth(now: Date): string {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 7);
}
