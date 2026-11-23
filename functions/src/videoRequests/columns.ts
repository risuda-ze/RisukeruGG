interface VideoRequestColumns {
  pendingColumnId: string;
  progressColumnId: string;
  reviewColumnId: string;
}

/** ユーザーが命名した列を表示名に依存せず識別する。 */
export function videoRequestColumns(config: Record<string, unknown>): VideoRequestColumns | null {
  const { pendingColumnId, progressColumnId, reviewColumnId } = config;
  const valid = (id: unknown): id is string =>
    typeof id === 'string' && id.length > 0 && !id.includes('/');
  if (!valid(pendingColumnId) || !valid(progressColumnId) || !valid(reviewColumnId)) return null;
  if (new Set([pendingColumnId, progressColumnId, reviewColumnId]).size !== 3) return null;
  return { pendingColumnId, progressColumnId, reviewColumnId };
}
