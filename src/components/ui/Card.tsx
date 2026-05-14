/* 汎用カードコンポーネント — ダークテーマ対応 */

import { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** trueのとき内部paddingなし（ヘッダー・コンテンツを直接配置） */
  noPadding?: boolean;
}

export interface CardHeaderProps {
  /** セクションタイトル */
  title: string;
  /** 右側アクション要素（例: "すべて見る →" リンク） */
  action?: ReactNode;
}

export function Card({ children, className = '', noPadding = false }: CardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-lg overflow-hidden ${
        noPadding ? '' : 'p-[18px]'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-border">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {action && <div className="text-xs text-muted">{action}</div>}
    </div>
  );
}
