'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getDiscordSettings, updateDiscordSettings } from '@/lib/repositories/teams';
import type { DiscordTeamConfig } from '@/types/entities';

interface DiscordSettingsSectionProps {
  teamId: string;
  isOperator: boolean;
}

/**
 * チーム設定画面の Discord 通知セクション。
 * operator のみ設定変更可（member/rom には非表示）。
 */
export function DiscordSettingsSection({ teamId, isOperator }: DiscordSettingsSectionProps) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyOnCreate, setNotifyOnCreate] = useState(false);
  const [notifyBefore1h, setNotifyBefore1h] = useState(false);
  const [notifyBefore15min, setNotifyBefore15min] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 既存設定を読み込む
  useEffect(() => {
    if (!isOperator) return;
    getDiscordSettings(teamId).then((config: DiscordTeamConfig | null) => {
      if (!config) return;
      setWebhookUrl(config.webhookUrl);
      setNotifyOnCreate(config.notifyOnCreate);
      setNotifyBefore1h(config.notifyBefore1h);
      setNotifyBefore15min(config.notifyBefore15min);
    });
  }, [teamId, isOperator]);

  // operator 以外には表示しない
  if (!isOperator) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      await updateDiscordSettings({
        teamId,
        webhookUrl,
        notifyOnCreate,
        notifyBefore1h,
        notifyBefore15min,
      });
      setToast({ type: 'success', message: 'Discord 設定を保存しました' });
    } catch {
      setToast({ type: 'error', message: '保存に失敗しました。もう一度お試しください。' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <Card noPadding>
      <CardHeader title="Discord 通知" />
      <form onSubmit={handleSave} className="p-[18px] space-y-5">
        {/* Webhook URL 入力 */}
        <div>
          <Input
            label="Webhook URL"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            type="url"
          />
          <p className="text-[11px] text-muted mt-1">
            Discord のサーバー設定 → 連携サービス → ウェブフック → URL をコピー
          </p>
        </div>

        {/* 通知タイミング */}
        <div className="space-y-3">
          <p className="text-[12px] font-semibold text-text">通知タイミング</p>
          <ToggleRow
            label="スケジュール作成時に通知"
            checked={notifyOnCreate}
            onChange={setNotifyOnCreate}
          />
          <ToggleRow
            label="開始 1 時間前にリマインダー"
            checked={notifyBefore1h}
            onChange={setNotifyBefore1h}
          />
          <ToggleRow
            label="開始 15 分前にリマインダー"
            checked={notifyBefore15min}
            onChange={setNotifyBefore15min}
          />
        </div>

        {/* 保存ボタン + トースト */}
        <div className="flex items-center gap-4">
          <Button type="submit" size="sm" loading={saving}>
            保存する
          </Button>
          {toast && (
            <p
              className="text-[12px]"
              style={{ color: toast.type === 'success' ? 'var(--green)' : 'var(--live)' }}
            >
              {toast.message}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}

/** ON/OFF トグル行 */
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-[13px] text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative w-10 h-6 rounded-full transition-colors focus:outline-none"
        style={{ background: checked ? 'var(--purple)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(2px)' }}
        />
      </button>
    </label>
  );
}
