'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { DiscordTeamConfig } from '@/types/entities';

interface DiscordBriefSettingsProps {
  teamId: string;
  idToken: string;
  config: DiscordTeamConfig;
  onSaved: () => void;
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);

/**
 * タスク管理 v2（ブリーフ）の Discord 連携設定（IN-023 / IN-027）。
 * ブリーフ別スレッドの親チャンネル、朝ダイジェストの送信先と時刻を設定する。
 */
export function DiscordBriefSettings({ teamId, idToken, config, onSaved }: DiscordBriefSettingsProps) {
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([]);
  // マウント時に一覧を取得するため初期値は true（effect 内で同期的に setState しない）
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [threadsEnabled, setThreadsEnabled] = useState(config.briefThreadsEnabled ?? true);
  const [briefChannelId, setBriefChannelId] = useState(config.briefChannelId ?? '');
  const [digestEnabled, setDigestEnabled] = useState(config.digestEnabled ?? true);
  const [digestChannelId, setDigestChannelId] = useState(config.digestChannelId ?? '');
  const [digestTime, setDigestTime] = useState(config.digestTime ?? '09:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/discord/guild-channels?teamId=${teamId}`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { channels: Array<{ id: string; name: string }> }) => {
        if (!cancelled) setChannels(data.channels);
      })
      .catch(() => {
        if (!cancelled) setMessage({ type: 'error', text: 'チャンネル一覧の取得に失敗しました' });
      })
      .finally(() => {
        if (!cancelled) setLoadingChannels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId, idToken]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/discord/update-brief-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          teamId,
          briefThreadsEnabled: threadsEnabled,
          briefChannelId: briefChannelId || null,
          digestEnabled,
          digestChannelId: digestChannelId || null,
          digestTime,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '保存に失敗しました');
      setMessage({ type: 'success', text: '保存しました' });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  }

  const channelSelect = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loadingChannels}
      className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] text-text focus:outline-none focus:border-purple"
    >
      <option value="">通知チャンネルと同じ{config.channelName ? `（#${config.channelName}）` : ''}</option>
      {channels.map((ch) => (
        <option key={ch.id} value={ch.id}>
          #{ch.name}
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-[12px] font-semibold text-text">タスク管理 v2（ブリーフ）</p>
      <p className="text-[11px] text-text-muted">
        ブリーフごとにスレッドを立て、工程の着手・完了をボタンで報告できます。毎朝、締切・遅延・入力待ちのダイジェストを送ります。
        スレッド作成には Bot の権限更新が必要な場合があります。うまく動かないときは「Botをサーバーに追加」を再実行してください。
      </p>

      <Toggle label="ブリーフごとにスレッドを立てる" checked={threadsEnabled} onChange={setThreadsEnabled} />
      <div className="space-y-1">
        <span className="text-[12px] text-text-muted">スレッドを立てるチャンネル</span>
        {channelSelect(briefChannelId, setBriefChannelId)}
      </div>

      <Toggle label="朝のダイジェストを送る" checked={digestEnabled} onChange={setDigestEnabled} />
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
        <div className="space-y-1">
          <span className="text-[12px] text-text-muted">ダイジェストの送信先</span>
          {channelSelect(digestChannelId, setDigestChannelId)}
        </div>
        <div className="space-y-1">
          <span className="text-[12px] text-text-muted">時刻（JST）</span>
          <select
            value={digestTime}
            onChange={(e) => setDigestTime(e.target.value)}
            className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] text-text focus:outline-none focus:border-purple"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <p className="text-[12px]" style={{ color: message.type === 'success' ? 'var(--green)' : 'var(--live)' }}>
          {message.text}
        </p>
      )}
      <Button size="sm" onClick={save} loading={saving}>
        保存する
      </Button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[13px] text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none p-0 overflow-hidden"
        style={{ background: checked ? 'var(--purple)' : 'var(--border)' }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: checked ? '22px' : '4px' }}
        />
      </button>
    </label>
  );
}
