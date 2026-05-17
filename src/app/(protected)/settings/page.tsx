'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useTaskCategoryStore } from '@/stores/taskCategories';
import { useScheduleCategoryStore } from '@/stores/scheduleCategories';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { NotificationPreferences, KanbanColumn, ScheduleCategory, TaskCategory } from '@/types/entities';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from '@/lib/repositories/kanbanColumns';
import {
  createScheduleCategory,
  updateScheduleCategory,
  deleteScheduleCategory,
} from '@/lib/repositories/scheduleCategories';
import {
  createTaskCategory,
  updateTaskCategory,
  deleteTaskCategory,
} from '@/lib/repositories/taskCategories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { TopBar } from '@/components/layout/TopBar';

type Tab = 'team' | 'tasks' | 'calendar' | 'notifications';

const TAB_LABELS: Record<Tab, string> = {
  team: 'チーム',
  tasks: 'タスク管理',
  calendar: 'スケジュール',
  notifications: '通知',
};

const DEFAULT_COLORS = [
  '#534AB7',
  '#7F77DD',
  '#ff4d6d',
  '#EF9F27',
  '#3fcf7f',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
];

/* カテゴリアイコン候補 (Material Icons) */
const ICON_OPTIONS = [
  'event',
  'sports_esports',
  'video_library',
  'live_tv',
  'mic',
  'movie',
  'music_note',
  'star',
  'campaign',
  'group',
  'school',
  'build',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('team');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="設定" />

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl">
        {/* ── タブナビゲーション ─────────────────────────────── */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-purple text-purple-l'
                  : 'border-transparent text-muted hover:text-text'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'team' && (
            <Card>
              <p className="text-sm text-muted">チーム設定（チーム管理ページから変更できます）</p>
            </Card>
          )}
          {activeTab === 'tasks' && <TaskManagementSettings />}
          {activeTab === 'calendar' && <ScheduleCategorySettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
        </div>
      </div>
    </div>
  );
}

/* ── スケジュールカテゴリ設定コンポーネント ─────────────── */
function ScheduleCategorySettings() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { categories, subscribe } = useScheduleCategoryStore();
  const teamId = currentTeam?.id;

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwner = myMember?.role === 'owner';

  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  /* 追加 */
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [newIcon, setNewIcon] = useState(ICON_OPTIONS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  /* 編集 */
  const [editingCat, setEditingCat] = useState<ScheduleCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* 削除確認 */
  const [deleteConfirm, setDeleteConfirm] = useState<ScheduleCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!teamId) {
    return (
      <Card>
        <p className="text-sm text-muted">チームに参加してください</p>
      </Card>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !teamId) return;
    setAdding(true);
    setAddError(null);
    try {
      await createScheduleCategory(teamId, {
        name: newName.trim(),
        icon: newIcon,
        color: newColor,
        order: categories.length,
      });
      setNewName('');
    } catch {
      setAddError('カテゴリの追加に失敗しました');
    } finally {
      setAdding(false);
    }
  }

  async function handleEditSave() {
    if (!editingCat || !teamId) return;
    setEditSaving(true);
    try {
      await updateScheduleCategory(teamId, editingCat.id, {
        name: editName,
        icon: editIcon,
        color: editColor,
      });
      setEditingCat(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !teamId) return;
    setDeleting(true);
    try {
      await deleteScheduleCategory(teamId, deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'カテゴリの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-text">スケジュールカテゴリの管理</h3>
      <p className="text-[12px] text-muted">
        カテゴリはスケジュールの予定カードの色分けに使用されます。
      </p>

      {/* カテゴリ一覧 */}
      <Card noPadding>
        {categories.length === 0 && (
          <p className="px-[18px] py-3 text-sm text-muted">カテゴリがありません</p>
        )}
        <div className="divide-y divide-border">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-[18px] py-3">
              {/* カラーサンプル + アイコン */}
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: `${cat.color}33`, color: cat.color }}
              >
                <span className="material-icons text-[18px]">{cat.icon}</span>
              </div>

              <span className="flex-1 text-sm text-text">{cat.name}</span>

              <span
                className="w-4 h-4 rounded-full shrink-0"
                style={{ background: cat.color }}
              />

              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setEditName(cat.name);
                      setEditColor(cat.color);
                      setEditIcon(cat.icon);
                    }}
                    className="p-1 text-muted hover:text-purple-l text-xs"
                    aria-label="編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat)}
                    className="p-1 text-muted hover:text-live text-xs"
                    aria-label="削除"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* カテゴリ追加 */}
      {isOwner && (
        <Card>
          <h4 className="text-sm font-medium text-text mb-3">カテゴリを追加</h4>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input
              label=""
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="カテゴリ名"
              maxLength={30}
              error={addError ?? undefined}
            />

            {/* アイコン選択 */}
            <div>
              <p className="text-[12px] font-medium text-muted mb-1.5">アイコン</p>
              <div className="flex gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    className={`w-8 h-8 rounded-[6px] flex items-center justify-center border-2 transition-all ${
                      newIcon === icon
                        ? 'border-purple-l bg-purple-d'
                        : 'border-transparent bg-surface hover:bg-card'
                    }`}
                    title={icon}
                  >
                    <span className="material-icons text-[18px] text-text">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* カラー選択 */}
            <div>
              <p className="text-[12px] font-medium text-muted mb-1.5">カラー</p>
              <div className="flex gap-1.5 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newColor === color ? 'border-text scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`色 ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* プレビュー */}
            {newName && (
              <div className="flex items-center gap-2 py-2">
                <div
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                  style={{ background: `${newColor}33`, color: newColor }}
                >
                  <span className="material-icons text-[16px]">{newIcon}</span>
                </div>
                <span
                  className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${newColor}22`, color: newColor }}
                >
                  {newName}
                </span>
              </div>
            )}

            <Button type="submit" size="sm" loading={adding} disabled={!newName.trim()}>
              追加する
            </Button>
          </form>
        </Card>
      )}

      {/* 編集モーダル */}
      {editingCat && (
        <Modal
          open={true}
          onClose={() => setEditingCat(null)}
          title="カテゴリを編集"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingCat(null)}>
                キャンセル
              </Button>
              <Button loading={editSaving} onClick={handleEditSave}>
                保存する
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="カテゴリ名"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
            />

            {/* アイコン選択 */}
            <div>
              <p className="text-sm font-medium text-text mb-2">アイコン</p>
              <div className="flex gap-1.5 flex-wrap">
                {ICON_OPTIONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditIcon(icon)}
                    className={`w-8 h-8 rounded-[6px] flex items-center justify-center border-2 transition-all ${
                      editIcon === icon
                        ? 'border-purple-l bg-purple-d'
                        : 'border-transparent bg-surface hover:bg-card'
                    }`}
                    title={icon}
                  >
                    <span className="material-icons text-[18px] text-text">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* カラー選択 */}
            <div>
              <p className="text-sm font-medium text-text mb-2">カラー</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${
                      editColor === color ? 'border-text' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`色 ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* プレビュー */}
            {editName && (
              <div className="flex items-center gap-2 py-1">
                <div
                  className="w-7 h-7 rounded-[6px] flex items-center justify-center"
                  style={{ background: `${editColor}33`, color: editColor }}
                >
                  <span className="material-icons text-[16px]">{editIcon}</span>
                </div>
                <span
                  className="text-[12px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${editColor}22`, color: editColor }}
                >
                  {editName}
                </span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirm(null)}
          title="カテゴリを削除"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                キャンセル
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete}>
                削除する
              </Button>
            </>
          }
        >
          <p className="text-sm text-text">
            「{deleteConfirm.name}」を削除します。このカテゴリを使用しているスケジュールは「未選択」になります。
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ── タスク管理設定（3セクションをまとめる） ─────────────────── */
function TaskManagementSettings() {
  return (
    <div className="space-y-8">
      <KanbanSettings />
      <TaskCategorySettings />
    </div>
  );
}

/* ── カンバン列の管理 ─────────────────────────────────────────── */
function KanbanSettings() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { tasks, columns, subscribe } = useTasksStore();
  const teamId = currentTeam?.id;

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwner = myMember?.role === 'owner';

  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(DEFAULT_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingColumn, setEditingColumn] = useState<KanbanColumn | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteConfirmColumn, setDeleteConfirmColumn] = useState<KanbanColumn | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!teamId) {
    return (
      <Card>
        <p className="text-sm text-muted">チームに参加してください</p>
      </Card>
    );
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim() || !teamId) return;
    setAdding(true);
    setAddError(null);
    try {
      await createColumn(teamId, {
        name: newColName.trim(),
        color: newColColor,
        order: columns.length,
      });
      setNewColName('');
    } catch {
      setAddError('カラムの追加に失敗しました');
    } finally {
      setAdding(false);
    }
  }

  async function handleEditSave() {
    if (!editingColumn || !teamId) return;
    setEditSaving(true);
    try {
      await updateColumn(teamId, editingColumn.id, { name: editName, color: editColor });
      setEditingColumn(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteColumn() {
    if (!deleteConfirmColumn || !teamId) return;
    const taskIds = tasks.filter((t) => t.columnId === deleteConfirmColumn.id).map((t) => t.id);
    setDeleting(true);
    try {
      await deleteColumn(teamId, deleteConfirmColumn.id, columns, taskIds);
      setDeleteConfirmColumn(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'カラムの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0 || !teamId) return;
    const reordered = [...columns];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    await reorderColumns(
      teamId,
      reordered.map((c, i) => ({ id: c.id, order: i }))
    );
  }

  async function handleMoveDown(index: number) {
    if (index === columns.length - 1 || !teamId) return;
    const reordered = [...columns];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    await reorderColumns(
      teamId,
      reordered.map((c, i) => ({ id: c.id, order: i }))
    );
  }

  const fallbackColumn = deleteConfirmColumn
    ? columns.find((c) => c.id !== deleteConfirmColumn.id)
    : null;
  const affectedTaskCount = deleteConfirmColumn
    ? tasks.filter((t) => t.columnId === deleteConfirmColumn.id).length
    : 0;

  async function handleToggleDoneRole(colId: string) {
    if (!teamId || !isOwner) return;
    const col = columns.find((c) => c.id === colId);
    if (!col) return;
    if (col.role === 'done') {
      /* 解除 */
      await updateColumn(teamId, colId, { role: null });
    } else {
      /* 現在のdoneカラムを解除してから新しいカラムをdoneに */
      const prevDone = columns.find((c) => c.role === 'done');
      if (prevDone) await updateColumn(teamId, prevDone.id, { role: null });
      await updateColumn(teamId, colId, { role: 'done' });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-text">列の管理</h3>
        <p className="text-[12px] text-muted mt-0.5">カンバンボードのステータス列を管理します。</p>
      </div>

      {/* ステータスの管理（完了列の指定） */}
      <div>
        <h4 className="text-[12px] font-semibold text-muted mb-2">ステータスの管理</h4>
        <Card noPadding>
          <div className="px-[18px] py-2.5 border-b border-border bg-surface/50">
            <p className="text-[11px] text-muted">「完了」とみなす列をひとつ選択してください。ダッシュボードの達成率計算に使用されます。</p>
          </div>
          {columns.map((col) => (
            <div key={col.id} className="flex items-center gap-3 px-[18px] py-2.5 border-b border-border last:border-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <span className="flex-1 text-sm text-text">{col.name}</span>
              {col.role === 'done' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)' }}>完了列</span>
              )}
              {isOwner && (
                <button
                  onClick={() => handleToggleDoneRole(col.id)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                    col.role === 'done'
                      ? 'border-green/30 text-green hover:bg-red-500/10 hover:text-live hover:border-live/30'
                      : 'border-border text-muted hover:text-text hover:border-border-l'
                  }`}
                >
                  {col.role === 'done' ? '解除' : '完了列に設定'}
                </button>
              )}
            </div>
          ))}
        </Card>
      </div>

      {/* カラム一覧 */}
      <div>
        <h4 className="text-[12px] font-semibold text-muted mb-2">カラム一覧</h4>
      <Card noPadding>
        {columns.length === 0 && (
          <p className="px-[18px] py-3 text-sm text-muted">カラムがありません</p>
        )}
        <div className="divide-y divide-border">
          {columns.map((col, index) => (
            <div key={col.id} className="flex items-center gap-3 px-[18px] py-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: col.color }}
              />
              <span className="flex-1 text-sm text-text">{col.name}</span>
              <span className="text-[11px] text-muted font-num">
                {tasks.filter((t) => t.columnId === col.id).length}件
              </span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 text-muted hover:text-text disabled:opacity-30 text-[11px]"
                    aria-label="上へ移動"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === columns.length - 1}
                    className="p-1 text-muted hover:text-text disabled:opacity-30 text-[11px]"
                    aria-label="下へ移動"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => {
                      setEditingColumn(col);
                      setEditName(col.name);
                      setEditColor(col.color);
                    }}
                    className="p-1 text-muted hover:text-purple-l text-xs"
                    aria-label="編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirmColumn(col)}
                    disabled={columns.length <= 1}
                    className="p-1 text-muted hover:text-live disabled:opacity-30 text-xs"
                    aria-label="削除"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
      </div>

      {/* カラム追加 */}
      {isOwner && (
        <Card>
          <h4 className="text-sm font-medium text-text mb-3">カラムを追加</h4>
          <form onSubmit={handleAddColumn} className="space-y-3">
            <Input
              label=""
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="カラム名"
              maxLength={30}
              error={addError ?? undefined}
            />
            <div className="flex gap-1.5 flex-wrap">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newColColor === color ? 'border-text scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`色 ${color}`}
                />
              ))}
            </div>
            <Button type="submit" size="sm" loading={adding} disabled={!newColName.trim()}>
              追加する
            </Button>
          </form>
        </Card>
      )}

      {/* 編集モーダル */}
      {editingColumn && (
        <Modal
          open={true}
          onClose={() => setEditingColumn(null)}
          title="カラムを編集"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingColumn(null)}>
                キャンセル
              </Button>
              <Button loading={editSaving} onClick={handleEditSave}>
                保存する
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="カラム名"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
            />
            <div>
              <p className="text-sm font-medium text-text mb-2">色</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${editColor === color ? 'border-text' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`色 ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirmColumn && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirmColumn(null)}
          title="カラムを削除"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirmColumn(null)}>
                キャンセル
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDeleteColumn}>
                削除する
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="text-text">「{deleteConfirmColumn.name}」を削除します。</p>
            {affectedTaskCount > 0 && (
              <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
                このカラムには {affectedTaskCount} 件のタスクがあります。 削除すると「
                {fallbackColumn?.name}」へ移動されます。
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── タスクカテゴリ設定コンポーネント ──────────────────────────── */
function TaskCategorySettings() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { taskCategories, subscribe } = useTaskCategoryStore();
  const teamId = currentTeam?.id;

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'owner' || myMember?.role === 'editor';

  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  /* 追加 */
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(DEFAULT_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  /* 編集 */
  const [editingCat, setEditingCat] = useState<TaskCategory | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  /* 削除確認 */
  const [deleteConfirm, setDeleteConfirm] = useState<TaskCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!teamId) {
    return (
      <Card>
        <p className="text-sm text-muted">チームに参加してください</p>
      </Card>
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !teamId) return;
    setAdding(true);
    setAddError(null);
    try {
      await createTaskCategory(teamId, {
        name: newName.trim(),
        color: newColor,
        order: taskCategories.length,
      });
      setNewName('');
    } catch {
      setAddError('カテゴリの追加に失敗しました');
    } finally {
      setAdding(false);
    }
  }

  async function handleEditSave() {
    if (!editingCat || !teamId) return;
    setEditSaving(true);
    try {
      await updateTaskCategory(teamId, editingCat.id, { name: editName, color: editColor });
      setEditingCat(null);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm || !teamId) return;
    setDeleting(true);
    try {
      await deleteTaskCategory(teamId, deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'カテゴリの削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-text">カテゴリの管理</h3>
        <p className="text-[12px] text-muted mt-0.5">タスクのカテゴリを追加・編集・削除します。</p>
      </div>

      {/* カテゴリ一覧 */}
      <Card noPadding>
        {taskCategories.length === 0 && (
          <p className="px-[18px] py-3 text-sm text-muted">カテゴリがありません</p>
        )}
        <div className="divide-y divide-border">
          {taskCategories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-[18px] py-3">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="flex-1 text-sm text-text">{cat.name}</span>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setEditName(cat.name);
                      setEditColor(cat.color);
                    }}
                    className="p-1 text-muted hover:text-purple-l text-xs"
                    aria-label="編集"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat)}
                    className="p-1 text-muted hover:text-live text-xs"
                    aria-label="削除"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* カテゴリ追加 */}
      {canEdit && (
        <Card>
          <h4 className="text-sm font-medium text-text mb-3">カテゴリを追加</h4>
          <form onSubmit={handleAdd} className="space-y-3">
            <Input
              label=""
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="カテゴリ名"
              maxLength={30}
              error={addError ?? undefined}
            />
            <div>
              <p className="text-[12px] font-medium text-muted mb-1.5">カラー</p>
              <div className="flex gap-1.5 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newColor === color ? 'border-text scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`色 ${color}`}
                  />
                ))}
              </div>
            </div>
            {newName && (
              <div className="flex items-center gap-2 py-1">
                <span
                  className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${newColor}22`, color: newColor, border: `1px solid ${newColor}44` }}
                >
                  {newName}
                </span>
              </div>
            )}
            <Button type="submit" size="sm" loading={adding} disabled={!newName.trim()}>
              追加する
            </Button>
          </form>
        </Card>
      )}

      {/* 編集モーダル */}
      {editingCat && (
        <Modal
          open={true}
          onClose={() => setEditingCat(null)}
          title="カテゴリを編集"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingCat(null)}>
                キャンセル
              </Button>
              <Button loading={editSaving} onClick={handleEditSave}>
                保存する
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="カテゴリ名"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={30}
            />
            <div>
              <p className="text-sm font-medium text-text mb-2">カラー</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${
                      editColor === color ? 'border-text' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`色 ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirm(null)}
          title="カテゴリを削除"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                キャンセル
              </Button>
              <Button variant="danger" loading={deleting} onClick={handleDelete}>
                削除する
              </Button>
            </>
          }
        >
          <p className="text-sm text-text">
            「{deleteConfirm.name}」を削除します。このカテゴリを使用しているタスクのカテゴリは未設定になります。
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ── 通知設定コンポーネント ─────────────────────────────────── */
type NotifCategory = keyof NotificationPreferences;
type NotifChannel = 'inApp' | 'push';

const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  collab: 'コラボ',
  tasks: 'タスク',
  reminders: 'リマインダー',
  system: 'システム',
};

const DEFAULT_PREFS: NotificationPreferences = {
  collab: { inApp: true, push: true },
  tasks: { inApp: true, push: true },
  reminders: { inApp: true, push: true },
  system: { inApp: true, push: false },
};

function NotificationSettings() {
  const { currentUser, members } = useAuthStore();
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isParty = myMember?.plan === 'party';
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  async function togglePref(category: NotifCategory, channel: NotifChannel) {
    if (!currentUser) return;
    const newPrefs = {
      ...prefs,
      [category]: { ...prefs[category], [channel]: !prefs[category][channel] },
    };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { notificationPreferences: newPrefs });
    } finally {
      setSaving(false);
    }
  }

  const categories: NotifCategory[] = ['collab', 'tasks', 'reminders', 'system'];

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-text">通知設定</h3>

      {/* LIGHTプラン案内 */}
      {!isParty && (
        <Card className="border-amber/20">
          <p className="text-sm font-medium text-amber-l mb-1">
            LIGHTプランではシステム通知のみ利用可能です
          </p>
          <p className="text-[12px] text-muted">
            PARTYプランにアップグレードすると全4カテゴリの通知を設定できます。
            <a href="/settings" className="underline ml-1 text-amber-l">
              アップグレードする
            </a>
          </p>
        </Card>
      )}

      <Card noPadding>
        {/* ヘッダー行 */}
        <div className="grid grid-cols-3 gap-0 border-b border-border px-[18px] py-2 bg-surface/50">
          <span className="text-[11px] font-medium text-muted">カテゴリ</span>
          <span className="text-[11px] font-medium text-muted text-center">アプリ内</span>
          <span className="text-[11px] font-medium text-muted text-center">プッシュ</span>
        </div>
        {categories.map((category) => {
          const isLocked = !isParty && category !== 'system';
          return (
            <div
              key={category}
              className={`grid grid-cols-3 gap-0 px-[18px] py-3 border-b border-border last:border-0 ${isLocked ? 'opacity-40' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-text">{NOTIF_CATEGORY_LABELS[category]}</span>
              </div>
              {(['inApp', 'push'] as NotifChannel[]).map((channel) => (
                <div key={channel} className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => !isLocked && togglePref(category, channel)}
                    disabled={isLocked || saving}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      !isLocked && prefs[category][channel] ? 'bg-purple' : 'bg-border'
                    } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={`${NOTIF_CATEGORY_LABELS[category]}の${channel === 'inApp' ? 'アプリ内' : 'プッシュ'}通知`}
                    aria-checked={prefs[category][channel]}
                    role="switch"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-text rounded-full shadow transition-transform ${
                        !isLocked && prefs[category][channel] ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
