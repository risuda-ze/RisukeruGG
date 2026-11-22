'use client';

import { useRouter } from 'next/navigation';
import type { Category, TeamMember } from '@/types/entities';
import { Button } from '@/components/ui/Button';

interface TaskControlBarProps {
  categories: Category[];
  members: TeamMember[];
  activeCategoryIds: string[];
  activeAssigneeId: string | null;
  taskCount: number;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategories: () => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onShowHint: () => void;
}

/**
 * タスク管理画面のコントロールバー。
 * 左エリア: カテゴリ複数選択バッジ（OR条件）+ 担当者プルダウン（単一選択）。
 * 右エリア: タスク件数 + 設定ボタン + ヒントボタン。
 * タスク追加の導線は PC=各列下部の「＋」、モバイル=FAB（TaskMobileBoard）に集約する。
 * モバイル (390px) でも同一1行レイアウトを維持する（左エリアは横スクロール）。
 */
export function TaskControlBar({
  categories,
  members,
  activeCategoryIds,
  activeAssigneeId,
  taskCount,
  onCategoryToggle,
  onClearCategories,
  onAssigneeChange,
  onShowHint,
}: TaskControlBarProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 px-4 py-2 md:px-7 shrink-0">
      {/* 左エリア: フィルタ（横スクロール可能） */}
      <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {/* 「すべて」バッジ: activeCategoryIds が空の場合にアクティブ */}
        <button
          onClick={onClearCategories}
          className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            activeCategoryIds.length === 0
              ? 'bg-primary/35 text-brand-2'
              : 'bg-surface border border-border text-text-muted hover:text-text'
          }`}
        >
          すべて
        </button>

        {/* カテゴリバッジ: activeCategoryIds に含まれる場合アクティブスタイル */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryToggle(cat.id)}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeCategoryIds.includes(cat.id)
                ? 'bg-primary/35 text-brand-2'
                : 'bg-surface border border-border text-text-muted hover:text-text'
            }`}
          >
            {cat.icon && (
              <span className="material-icons text-[11px]" aria-hidden="true">
                {cat.icon}
              </span>
            )}
            {cat.name}
          </button>
        ))}

        {/* 担当者プルダウン: チームの全メンバーを常に表示 */}
        <select
          value={activeAssigneeId ?? ''}
          onChange={(e) => onAssigneeChange(e.target.value || null)}
          className="shrink-0 rounded-full px-3 py-1.5 text-xs border border-border bg-surface text-text-muted hover:text-text transition-colors cursor-pointer outline-none focus:border-primary"
          aria-label="担当者でフィルタ"
        >
          <option value="">担当者: すべて</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </div>

      {/* 右エリア: アクションボタン群（縮まない） */}
      <div className="flex items-center gap-2 shrink-0">
        {/* タスク件数テキスト */}
        <span className="text-[12px] text-text-muted whitespace-nowrap">{taskCount}件</span>

        {/* タスク追加の導線はPC=各列下部の「＋」、モバイル=FABに集約（ツールバーのボタンは廃止） */}

        {/* ステータス・カテゴリ設定ボタン: Next.js router で遷移 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/settings/categories')}
          aria-label="ステータス・カテゴリ設定"
        >
          設定
        </Button>

        {/* ヒント表示ボタン */}
        <button
          onClick={onShowHint}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-text-muted hover:text-text transition-colors"
          style={{ background: 'var(--surface)' }}
          aria-label="ヒントを表示"
          title="操作ヒントを表示"
        >
          <span className="text-[13px] font-bold">?</span>
        </button>
      </div>
    </div>
  );
}
