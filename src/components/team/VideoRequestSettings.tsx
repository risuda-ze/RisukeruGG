'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import type { TaskStatus } from '@/types/entities';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
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
  routing: {
    editorChannelId: '',
    thumbnailChannelId: '',
    thumbnailLongIds: [] as string[],
    thumbnailShortIds: [] as string[],
    editorChannels: {} as Record<string, string>,
  },
};

export function VideoRequestSettings({
  teamId,
  columns,
}: {
  teamId: string;
  columns: TaskStatus[];
}) {
  const [settings, setSettings] = useState(defaults);
  const [longIds, setLongIds] = useState('');
  const [shortIds, setShortIds] = useState('');
  const [overrides, setOverrides] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const available = columns.filter((col) => col.role !== 'done');
  useEffect(() => {
    let active = true;
    getDoc(doc(db, 'teams', teamId, 'settings', 'videoRequests'))
      .then((snapshot) => {
        if (active) {
          const data = snapshot.data();
          const stored = { ...defaults, ...data, routing: { ...defaults.routing, ...data?.routing } };
          setSettings(stored);
          setLongIds(stored.routing.thumbnailLongIds.join(', '));
          setShortIds(stored.routing.thumbnailShortIds.join(', '));
          setOverrides(
            Object.entries(stored.routing.editorChannels)
              .map(([user, channel]) => user + '=' + channel)
              .join('\n')
          );
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
      const splitIds = (value: string) => [...new Set(value.split(/[\s,、]+/).filter(Boolean))];
      const routing = {
        ...settings.routing,
        editorChannelId: settings.routing.editorChannelId.trim(),
        thumbnailChannelId: settings.routing.thumbnailChannelId.trim(),
        thumbnailLongIds: splitIds(longIds),
        thumbnailShortIds: splitIds(shortIds),
        editorChannels: {} as Record<string, string>,
      };
      const ids = [
        routing.editorChannelId,
        ...routing.thumbnailLongIds,
        ...routing.thumbnailShortIds,
      ];
      if (settings.createThumbnailTask || routing.thumbnailChannelId)
        ids.push(routing.thumbnailChannelId);
      for (const line of overrides
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)) {
        const pair = line.split('=').map((value) => value.trim());
        if (pair.length !== 2) {
          setMessage('担当者別の送信先は「ユーザーID=チャンネルID」で入力してください');
          return;
        }
        ids.push(...pair);
        routing.editorChannels[pair[0]] = pair[1];
      }
      if (ids.some((id) => !/^\d{17,20}$/.test(id))) {
        setMessage('DiscordのIDは17〜20桁の半角数字で入力してください');
        return;
      }
      await setDoc(doc(db, 'teams', teamId, 'settings', 'videoRequests'), { ...settings, routing });
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
        <Input
          label="動画編集の送信先チャンネルID"
          required
          value={settings.routing.editorChannelId}
          onChange={(e) =>
            setSettings({
              ...settings,
              routing: { ...settings.routing, editorChannelId: e.target.value },
            })
          }
        />
        <Textarea
          label="担当者別の送信先（任意）"
          value={overrides}
          onChange={(e) => setOverrides(e.target.value)}
          placeholder="1行につき、ユーザーID=チャンネルID"
        />
        {settings.createThumbnailTask && (
          <>
            <Input
              label="サムネ制作の送信先チャンネルID"
              required
              value={settings.routing.thumbnailChannelId}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  routing: { ...settings.routing, thumbnailChannelId: e.target.value },
                })
              }
            />
            <Input
              label="横動画のサムネ担当者ID"
              value={longIds}
              hint="複数人はカンマ区切り"
              onChange={(e) => setLongIds(e.target.value)}
            />
            <Input
              label="ショートのサムネ担当者ID"
              value={shortIds}
              hint="複数人はカンマ区切り"
              onChange={(e) => setShortIds(e.target.value)}
            />
          </>
        )}
        <Button type="submit" disabled={!ready || !valid || saving}>
          動画依頼の設定を保存
        </Button>
        {message && <p role="status">{message}</p>}
      </form>
    </Card>
  );
}
