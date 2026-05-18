/** フォーム入力の一時保存・復元ユーティリティ（localStorage ベース） */

/**
 * Date を含むオブジェクトを再帰的にシリアライズする。
 * JSON.stringify の replacer は Date.toJSON() が先に呼ばれるため
 * instanceof Date が常に false になる。この関数で事前変換する。
 */
function serializeDates(value: unknown): unknown {
  if (value instanceof Date) {
    return { __type: 'Date', iso: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return value.map(serializeDates);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeDates(v)])
    );
  }
  return value;
}

/** シリアライズされた Date を復元するリバイバー */
function reviver(_key: string, value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    (value as Record<string, unknown>).__type === 'Date'
  ) {
    const record = value as Record<string, unknown>;
    // iso (新形式) と value (旧形式) の両方に対応
    const isoStr = (record.iso ?? record.value) as string;
    return new Date(isoStr);
  }
  return value;
}

/**
 * フォームの入力内容を localStorage に保存する
 * @param key ドラフトを識別するキー（例: 'draft:schedule:new'）
 * @param data 保存するフォームデータ
 */
export function saveDraft<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(serializeDates(data as unknown)));
  } catch {
    // localStorage が使用不可の環境では無視
  }
}

/**
 * localStorage からフォームのドラフトを読み込む
 * @param key ドラフトを識別するキー
 * @returns 保存済みデータ、存在しない場合は null
 */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw, reviver) as T;
  } catch {
    return null;
  }
}

/**
 * localStorage からドラフトを削除する
 * @param key ドラフトを識別するキー
 */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 無視
  }
}

/** アプリ内で使用するドラフトキーの定数 */
export const DRAFT_KEYS = {
  SCHEDULE_NEW: 'draft:schedule:new',
  scheduleEdit: (id: string): string => `draft:schedule:${id}`,
  TASK_NEW: 'draft:task:new',
  taskEdit: (id: string): string => `draft:task:${id}`,
} as const;
