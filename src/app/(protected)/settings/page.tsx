'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { NotificationPreferences } from '@/types/entities';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from '@/lib/repositories/kanbanColumns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { KanbanColumn } from '@/types/entities';

type Tab = 'team' | 'kanban' | 'calendar' | 'notifications';

const TAB_LABELS: Record<Tab, string> = {
  team: 'チーム',
  kanban: 'カンバン',
  calendar: 'カレンダー',
  notifications: '通知',
};

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('team');

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">設定</h1>

      {/* タブナビゲーション */}
      <div className="mb-6 flex gap-1 border-b border-zinc-200">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
            aria-selected={activeTab === tab}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'team' && (
          <div className="text-sm text-zinc-500">チーム設定（US1フェーズで実装）</div>
        )}
        {activeTab === 'kanban' && <KanbanSettings />}
        {activeTab === 'calendar' && (
          <div className="text-sm text-zinc-500">カレンダー設定（US2フェーズで実装）</div>
        )}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}

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

  if (!teamId) return <p className="text-sm text-zinc-500">チームに参加してください</p>;

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

  function openEdit(col: KanbanColumn) {
    setEditingColumn(col);
    setEditName(col.name);
    setEditColor(col.color);
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

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-zinc-900">カンバン列の管理</h2>

      {/* 現在のカラム一覧 */}
      <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
        {columns.length === 0 && (
          <p className="px-4 py-3 text-sm text-zinc-500">カラムがありません</p>
        )}
        {columns.map((col, index) => (
          <div key={col.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: col.color }}
            />
            <span className="flex-1 text-sm font-medium text-zinc-800">{col.name}</span>
            <span className="text-xs text-zinc-400">
              {tasks.filter((t) => t.columnId === col.id).length}件
            </span>
            {isOwner && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                  aria-label="上へ移動"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === columns.length - 1}
                  className="p-1 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                  aria-label="下へ移動"
                >
                  ▼
                </button>
                <button
                  onClick={() => openEdit(col)}
                  className="p-1 text-zinc-400 hover:text-blue-600 text-xs"
                  aria-label="カラムを編集"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteConfirmColumn(col)}
                  disabled={columns.length <= 1}
                  className="p-1 text-zinc-400 hover:text-red-600 disabled:opacity-30 text-xs"
                  aria-label="カラムを削除"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* カラム追加（Owner専用） */}
      {isOwner && (
        <form onSubmit={handleAddColumn} className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-700">カラムを追加</h3>
          <div className="flex gap-3">
            <Input
              label=""
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="カラム名"
              maxLength={30}
              error={addError ?? undefined}
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColColor(color)}
                  className={`w-6 h-6 rounded-full border-2 ${
                    newColColor === color ? 'border-zinc-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`色 ${color}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" loading={adding} disabled={!newColName.trim()}>
            追加する
          </Button>
        </form>
      )}

      {/* カラム編集モーダル */}
      {editingColumn && (
        <Modal
          open={true}
          onClose={() => setEditingColumn(null)}
          title="カラムを編集"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingColumn(null)}>キャンセル</Button>
              <Button loading={editSaving} onClick={handleEditSave}>保存する</Button>
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
              <p className="text-sm font-medium text-zinc-700 mb-2">色</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${
                      editColor === color ? 'border-zinc-900' : 'border-transparent'
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

      {/* カラム削除確認モーダル */}
      {deleteConfirmColumn && (
        <Modal
          open={true}
          onClose={() => setDeleteConfirmColumn(null)}
          title="カラムを削除"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteConfirmColumn(null)}>キャンセル</Button>
              <Button variant="danger" loading={deleting} onClick={handleDeleteColumn}>削除する</Button>
            </>
          }
        >
          <div className="space-y-3 text-sm text-zinc-700">
            <p>
              「{deleteConfirmColumn.name}」を削除します。
            </p>
            {affectedTaskCount > 0 && (
              <p className="text-amber-700 bg-amber-50 rounded p-3">
                このカラムには {affectedTaskCount} 件のタスクがあります。
                削除すると「{fallbackColumn?.name}」へ移動されます。
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

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
      [category]: {
        ...prefs[category],
        [channel]: !prefs[category][channel],
      },
    };
    setPrefs(newPrefs);
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        notificationPreferences: newPrefs,
      });
    } finally {
      setSaving(false);
    }
  }

  const categories: NotifCategory[] = ['collab', 'tasks', 'reminders', 'system'];

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-zinc-900">通知設定</h2>

      {!isParty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-medium text-amber-800 mb-1">LIGHTプランではシステム通知のみ利用可能です</p>
          <p className="text-amber-700">
            PARTYプランにアップグレードすると全4カテゴリの通知を設定できます。
            <a href="#" className="underline ml-1">アップグレードする</a>
          </p>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="grid grid-cols-3 gap-0 border-b border-zinc-100 px-4 py-2 bg-zinc-50">
          <span className="text-xs font-medium text-zinc-500">カテゴリ</span>
          <span className="text-xs font-medium text-zinc-500 text-center">アプリ内</span>
          <span className="text-xs font-medium text-zinc-500 text-center">プッシュ</span>
        </div>
        {categories.map((category) => {
          const isLocked = !isParty && category !== 'system';
          return (
            <div key={category} className="grid grid-cols-3 gap-0 px-4 py-3 border-b border-zinc-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-700">{NOTIF_CATEGORY_LABELS[category]}</span>
                {isLocked && <span className="text-xs text-zinc-400">🔒</span>}
              </div>
              {(['inApp', 'push'] as NotifChannel[]).map((channel) => (
                <div key={channel} className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => !isLocked && togglePref(category, channel)}
                    disabled={isLocked || saving}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      !isLocked && prefs[category][channel]
                        ? 'bg-blue-500'
                        : 'bg-zinc-200'
                    } ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label={`${NOTIF_CATEGORY_LABELS[category]}の${channel === 'inApp' ? 'アプリ内' : 'プッシュ'}通知`}
                    aria-checked={prefs[category][channel]}
                    role="switch"
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        !isLocked && prefs[category][channel] ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
