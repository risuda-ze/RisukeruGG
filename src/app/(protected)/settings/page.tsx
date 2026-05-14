'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useTasksStore } from '@/stores/tasks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { NotificationPreferences, KanbanColumn } from '@/types/entities';
import {
  createColumn,
  updateColumn,
  deleteColumn,
  reorderColumns,
} from '@/lib/repositories/kanbanColumns';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';

type Tab = 'team' | 'kanban' | 'calendar' | 'notifications';

const TAB_LABELS: Record<Tab, string> = {
  team:          'チーム',
  kanban:        'カンバン',
  calendar:      'カレンダー',
  notifications: '通知',
};

const DEFAULT_COLORS = [
  '#534AB7', '#7F77DD', '#ff4d6d', '#EF9F27',
  '#3fcf7f', '#14b8a6', '#3b82f6', '#a855f7',
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('team');

  return (
    <div className="px-4 py-6 md:px-7 max-w-3xl">
      <h2 className="text-base font-semibold text-text mb-5">設定</h2>

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
        {activeTab === 'kanban' && <KanbanSettings />}
        {activeTab === 'calendar' && (
          <Card>
            <p className="text-sm text-muted">カレンダー設定（Googleカレンダー連携は近日公開）</p>
          </Card>
        )}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}

/* ── カンバン設定コンポーネント ─────────────────────────────── */
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
    return <Card><p className="text-sm text-muted">チームに参加してください</p></Card>;
  }

  async function handleAddColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!newColName.trim() || !teamId) return;
    setAdding(true);
    setAddError(null);
    try {
      await createColumn(teamId, { name: newColName.trim(), color: newColColor, order: columns.length });
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
    await reorderColumns(teamId, reordered.map((c, i) => ({ id: c.id, order: i })));
  }

  async function handleMoveDown(index: number) {
    if (index === columns.length - 1 || !teamId) return;
    const reordered = [...columns];
    [reordered[index], reordered[index + 1]] = [reordered[index + 1], reordered[index]];
    await reorderColumns(teamId, reordered.map((c, i) => ({ id: c.id, order: i })));
  }

  const fallbackColumn = deleteConfirmColumn ? columns.find((c) => c.id !== deleteConfirmColumn.id) : null;
  const affectedTaskCount = deleteConfirmColumn ? tasks.filter((t) => t.columnId === deleteConfirmColumn.id).length : 0;

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-text">カンバン列の管理</h3>

      {/* カラム一覧 */}
      <Card noPadding>
        {columns.length === 0 && (
          <p className="px-[18px] py-3 text-sm text-muted">カラムがありません</p>
        )}
        <div className="divide-y divide-border">
          {columns.map((col, index) => (
            <div key={col.id} className="flex items-center gap-3 px-[18px] py-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <span className="flex-1 text-sm text-text">{col.name}</span>
              <span className="text-[11px] text-muted font-num">
                {tasks.filter((t) => t.columnId === col.id).length}件
              </span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMoveUp(index)} disabled={index === 0}
                    className="p-1 text-muted hover:text-text disabled:opacity-30 text-[11px]" aria-label="上へ移動">▲</button>
                  <button onClick={() => handleMoveDown(index)} disabled={index === columns.length - 1}
                    className="p-1 text-muted hover:text-text disabled:opacity-30 text-[11px]" aria-label="下へ移動">▼</button>
                  <button onClick={() => { setEditingColumn(col); setEditName(col.name); setEditColor(col.color); }}
                    className="p-1 text-muted hover:text-purple-l text-xs" aria-label="編集">✏️</button>
                  <button onClick={() => setDeleteConfirmColumn(col)} disabled={columns.length <= 1}
                    className="p-1 text-muted hover:text-live disabled:opacity-30 text-xs" aria-label="削除">🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

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
                <button key={color} type="button" onClick={() => setNewColColor(color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${newColColor === color ? 'border-text scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: color }} aria-label={`色 ${color}`} />
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
        <Modal open={true} onClose={() => setEditingColumn(null)} title="カラムを編集"
          footer={<>
            <Button variant="secondary" onClick={() => setEditingColumn(null)}>キャンセル</Button>
            <Button loading={editSaving} onClick={handleEditSave}>保存する</Button>
          </>}>
          <div className="space-y-4">
            <Input label="カラム名" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={30} />
            <div>
              <p className="text-sm font-medium text-text mb-2">色</p>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setEditColor(color)}
                    className={`w-7 h-7 rounded-full border-2 ${editColor === color ? 'border-text' : 'border-transparent'}`}
                    style={{ backgroundColor: color }} aria-label={`色 ${color}`} />
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirmColumn && (
        <Modal open={true} onClose={() => setDeleteConfirmColumn(null)} title="カラムを削除"
          footer={<>
            <Button variant="secondary" onClick={() => setDeleteConfirmColumn(null)}>キャンセル</Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteColumn}>削除する</Button>
          </>}>
          <div className="space-y-3 text-sm">
            <p className="text-text">「{deleteConfirmColumn.name}」を削除します。</p>
            {affectedTaskCount > 0 && (
              <p className="text-amber-l bg-amber/10 border border-amber/30 rounded-[8px] p-3">
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

/* ── 通知設定コンポーネント ─────────────────────────────────── */
type NotifCategory = keyof NotificationPreferences;
type NotifChannel  = 'inApp' | 'push';

const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  collab:    'コラボ',
  tasks:     'タスク',
  reminders: 'リマインダー',
  system:    'システム',
};

const DEFAULT_PREFS: NotificationPreferences = {
  collab:    { inApp: true, push: true },
  tasks:     { inApp: true, push: true },
  reminders: { inApp: true, push: true },
  system:    { inApp: true, push: false },
};

function NotificationSettings() {
  const { currentUser, members } = useAuthStore();
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isParty = myMember?.plan === 'party';
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  async function togglePref(category: NotifCategory, channel: NotifChannel) {
    if (!currentUser) return;
    const newPrefs = { ...prefs, [category]: { ...prefs[category], [channel]: !prefs[category][channel] } };
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
          <p className="text-sm font-medium text-amber-l mb-1">LIGHTプランではシステム通知のみ利用可能です</p>
          <p className="text-[12px] text-muted">
            PARTYプランにアップグレードすると全4カテゴリの通知を設定できます。
            <a href="/settings" className="underline ml-1 text-amber-l">アップグレードする</a>
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
            <div key={category} className={`grid grid-cols-3 gap-0 px-[18px] py-3 border-b border-border last:border-0 ${isLocked ? 'opacity-40' : ''}`}>
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
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-text rounded-full shadow transition-transform ${
                      !isLocked && prefs[category][channel] ? 'translate-x-4' : 'translate-x-0'
                    }`} />
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
