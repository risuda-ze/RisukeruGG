'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TaskStatus } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const labels = {
  pendingColumnId: 'Discord送信待ち',
  progressColumnId: '制作中',
  reviewColumnId: '納品確認待ち',
} as const;
type ColumnKey = keyof typeof labels;
const keys = Object.keys(labels) as ColumnKey[];
const defaults = {
  pendingColumnId: '',
  progressColumnId: '',
  reviewColumnId: '',
  createThumbnailTask: false,
};

export function VideoRequestSettings({
  teamId,
  columns,
}: {
  teamId: string;
  columns: TaskStatus[];
}) {
  const [settings, setSettings] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const available = columns.filter((col) => col.role !== 'done');
  useEffect(() => {
    let active = true;
    getDoc(doc(db, 'teams', teamId, 'settings', 'videoRequests'))
      .then((snapshot) => {
        if (active) {
          setSettings({ ...defaults, ...snapshot.data() });
          setReady(true);
        }
      })
      .catch(() => {
        if (active) setMessage('設定の読み込みに失敗しました');
      });
    return () => {
      active = false;
    };
  }, [teamId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'teams', teamId, 'settings', 'videoRequests'), settings);
      setMessage('保存しました。次の動画依頼から適用されます。');
    } catch {
      setMessage('設定を保存できませんでした');
    } finally {
      setSaving(false);
    }
  }
  const ids = keys.map((key) => settings[key]);
  const valid =
    new Set(ids).size === keys.length && ids.every((id) => available.some((col) => col.id === id));
  return (
    <Card>
      <form className="space-y-3" onSubmit={save}>
        <h4 className="font-semibold">動画依頼の設定</h4>
        <p className="text-sm text-muted">
          各段階に別々の列を指定します。承認時は完了列に移動します。
        </p>
        {keys.map((key) => (
          <label key={key} className="block">
            {labels[key]}
            <select
              className="ds-field"
              value={settings[key]}
              disabled={!ready || saving}
              onChange={(e) => {
                setMessage('');
                setSettings({ ...settings, [key]: e.target.value });
              }}
            >
              <option value="">列を選択</option>
              {available.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </label>
        ))}
        <label className="block">
          <input
            type="checkbox"
            checked={settings.createThumbnailTask}
            disabled={!ready || saving}
            onChange={(e) => {
              setMessage('');
              setSettings({ ...settings, createThumbnailTask: e.target.checked });
            }}
          />{' '}
          サムネ制作も依頼する
        </label>
        <Button type="submit" disabled={!ready || !valid || saving}>
          動画依頼の設定を保存
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </Card>
  );
}
