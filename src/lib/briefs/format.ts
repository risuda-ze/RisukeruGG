import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/** Date → "yyyy-MM-dd"（DateInput の値）。null は空文字 */
export function toDateInputValue(d: Date | null): string {
  return d ? format(d, 'yyyy-MM-dd') : '';
}

/** "yyyy-MM-dd" → ローカル 0 時の Date。空・不正は null */
export function fromDateInputValue(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** 表示用の短い日付（例: 9/12（土）） */
export function formatShortDate(d: Date | null): string {
  return d ? format(d, 'M/d（E）', { locale: ja }) : '未設定';
}

/** 表示用の日付（例: 2026/9/12） */
export function formatDate(d: Date | null): string {
  return d ? format(d, 'yyyy/M/d') : '未設定';
}

/** 表示用の日時（例: 9/6 10:23） */
export function formatDateTime(d: Date): string {
  return format(d, 'M/d HH:mm');
}
