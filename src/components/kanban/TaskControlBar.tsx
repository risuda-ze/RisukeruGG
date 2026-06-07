'use client';

import { useRouter } from 'next/navigation';
import type { TaskCategory, TeamMember } from '@/types/entities';
import { Button } from '@/components/ui/Button';

interface TaskControlBarProps {
  categories: TaskCategory[];
  members: TeamMember[];
  activeCategoryIds: string[];
  activeAssigneeId: string | null;
  taskCount: number;
  canEdit: boolean;
  isLightPlanFull: boolean;
  onCategoryToggle: (categoryId: string) => void;
  onClearCategories: () => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onAddTask: () => void;
  onShowHint: () => void;
}

/**
 * タスク管理画面のコントロールバー。
 * 左エリア: カテゴリ複数選択バッジ（OR条件）+ 担当者プルダウン（単一選択）。
 * 右エリア: タスク件数 + タスク追加ボタン + 設定ボタン + ヒントボタン。
 * モバイル (390px) でも同一1行レイアウトを維持する（左エリアは横スクロール）。
 */
export function TaskControlBar({
  categories,
  members,
  activeCategoryIds,
  activeAssigneeId,
  taskCount,
  canEdit,
  isLightPlanFull,
  onCategoryToggle,
  onClearCategories,
  onAssigneeChange,
  onAddTask,
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
              ? 'bg-purple-d text-purple-l'
              : 'bg-surface border border-border text-muted hover:text-text'
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
                ? 'bg-purple-d text-purple-l'
                : 'bg-surface border border-border text-muted hover:text-text'
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
          className="shrink-0 rounded-full px-3 py-1.5 text-xs border border-border bg-surface text-muted hover:text-text transition-colors cursor-pointer outline-none focus:border-primary"
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
        <span className="text-[12px] text-muted whitespace-nowrap">{taskCount}件</span>

        {/* タスク追加ボタン: ライトプラン上限時 disabled */}
        {canEdit && (
          <Button
            variant="amber"
            size="sm"
            onClick={onAddTask}
            disabled={isLightPlanFull}
            aria-label="タスクを追加"
          >
            + タスク
          </Button>
        )}

        {/* ステータス・カテゴリ設定ボタン: Next.js router で遷移 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/settings/tasks')}
          aria-label="ステータス・カテゴリ設定"
        >
          設定
        </Button>

        {/* ヒント表示ボタン */}
        <button
          onClick={onShowHint}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-border text-muted hover:text-text transition-colors"
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
