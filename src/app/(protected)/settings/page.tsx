'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { useTaskCategoryStore } from '@/stores/taskCategories';
import { useScheduleCategoryStore } from '@/stores/scheduleCategories';
import type { TaskStatus, ScheduleCategory, TaskCategory } from '@/types/entities';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from '@/lib/repositories/taskStatuses';
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
import { DiscordConnectSection } from '@/components/settings/DiscordConnectSection';

type Tab = 'calendar' | 'tasks' | 'account';

const TAB_LABELS: Record<Tab, string> = {
  calendar: 'スケジュール',
  tasks: 'タスク管理',
  account: 'アカウント',
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
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="チャンネル設定" />

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
          {activeTab === 'tasks' && <TaskManagementSettings />}
          {activeTab === 'calendar' && <ScheduleCategorySettings />}
          {activeTab === 'account' && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}

/* ── アカウント設定（Discord 連携など） ─────────────────── */
function AccountSettings() {
  return (
    <div className="space-y-5">
      <DiscordConnectSection />
    </div>
  );
}

/* ── スケジュールカテゴリ設定コンポーネント ─────────────── */
function ScheduleCategorySettings() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const { categories, subscribe } = useScheduleCategoryStore();
  const teamId = currentTeam?.id;

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOperator = myMember?.role === 'operator';

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

              <span className="w-4 h-4 rounded-full shrink-0" style={{ background: cat.color }} />

              {isOperator && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setEditName(cat.name);
                      setEditColor(cat.color);
                      setEditIcon(cat.icon);
                    }}
                    className="p-1 rounded-[6px] text-text hover:text-purple-l transition-colors"
                    aria-label="編集"
                  >
                    <span className="material-icons text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat)}
                    className="p-1 rounded-[6px] text-text hover:text-live transition-colors"
                    aria-label="削除"
                  >
                    <span className="material-icons text-[16px]">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* カテゴリ追加 */}
      {isOperator && (
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
            「{deleteConfirm.name}
            」を削除します。このカテゴリを使用しているスケジュールは「未選択」になります。
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
  const isOperator = myMember?.role === 'operator';

  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  const [newColName, setNewColName] = useState('');
  const [newColColor, setNewColColor] = useState(DEFAULT_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingColumn, setEditingColumn] = useState<TaskStatus | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editIsDone, setEditIsDone] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [deleteConfirmColumn, setDeleteConfirmColumn] = useState<TaskStatus | null>(null);
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
      if (editIsDone && editingColumn.role !== 'done') {
        /* 既存の完了列を解除してから新しい完了列を設定 */
        const prevDone = columns.find((c) => c.role === 'done');
        if (prevDone) await updateColumn(teamId, prevDone.id, { role: null });
      }
      await updateColumn(teamId, editingColumn.id, {
        name: editName,
        color: editColor,
        role: editIsDone ? 'done' : null,
      });
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

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-text">カラムの管理</h3>
        <p className="text-[12px] text-muted mt-0.5">
          「完了」とみなす列をひとつ選択してください。ダッシュボードの達成率計算に使用されます。
        </p>
      </div>

      {/* カラム一覧 */}
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
              {col.role === 'done' && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)' }}
                >
                  完了列
                </span>
              )}
              <span className="text-[11px] text-muted font-num shrink-0">
                {tasks.filter((t) => t.columnId === col.id).length}件
              </span>
              {isOperator && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 rounded-[6px] text-text hover:text-text disabled:opacity-30 transition-colors"
                    aria-label="上へ移動"
                  >
                    <span className="material-icons text-[16px]">keyboard_arrow_up</span>
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === columns.length - 1}
                    className="p-1 rounded-[6px] text-text hover:text-text disabled:opacity-30 transition-colors"
                    aria-label="下へ移動"
                  >
                    <span className="material-icons text-[16px]">keyboard_arrow_down</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingColumn(col);
                      setEditName(col.name);
                      setEditColor(col.color);
                      setEditIsDone(col.role === 'done');
                    }}
                    className="p-1 rounded-[6px] text-text hover:text-purple-l transition-colors"
                    aria-label="編集"
                  >
                    <span className="material-icons text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirmColumn(col)}
                    disabled={columns.length <= 1}
                    className="p-1 rounded-[6px] text-text hover:text-live disabled:opacity-30 transition-colors"
                    aria-label="削除"
                  >
                    <span className="material-icons text-[16px]">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* カラム追加 */}
      {isOperator && (
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
            {/* 完了列の設定トグル */}
            <div
              className={`flex items-center justify-between rounded-[10px] px-4 py-3 border cursor-pointer transition-all select-none ${
                editIsDone ? 'border-green/30 bg-green/5' : 'border-border bg-surface/50'
              }`}
              onClick={() => setEditIsDone((v) => !v)}
            >
              <div>
                <p className="text-sm font-medium text-text">完了列に設定</p>
                <p className="text-[11px] text-muted mt-0.5">
                  この列を「完了」とみなし、達成率計算に使用します
                </p>
              </div>
              <div
                className={`w-10 h-6 rounded-full relative transition-all shrink-0 ${
                  editIsDone ? 'bg-green/50' : 'bg-muted/30'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full transition-all ${
                    editIsDone ? 'right-1 bg-green' : 'left-1 bg-muted'
                  }`}
                />
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
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';

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
                    className="p-1 rounded-[6px] text-text hover:text-purple-l transition-colors"
                    aria-label="編集"
                  >
                    <span className="material-icons text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(cat)}
                    className="p-1 rounded-[6px] text-text hover:text-live transition-colors"
                    aria-label="削除"
                  >
                    <span className="material-icons text-[16px]">delete</span>
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
                  style={{
                    background: `${newColor}22`,
                    color: newColor,
                    border: `1px solid ${newColor}44`,
                  }}
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
            「{deleteConfirm.name}
            」を削除します。このカテゴリを使用しているタスクのカテゴリは未設定になります。
          </p>
        </Modal>
      )}
    </div>
  );
}
