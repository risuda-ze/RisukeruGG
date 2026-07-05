'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updateDiscordSettings } from '@/lib/repositories/teams';
import type { DiscordTeamConfig } from '@/types/entities';

interface DiscordSettingsSectionProps {
  teamId: string;
  isOperator: boolean;
}

/**
 * チーム設定画面の Discord 連携セクション。
 * operator のみ設定変更可（member/rom には非表示）。
 *
 * 3つの状態を管理する:
 * - 未招待: 「Botをサーバーに追加」ボタンを表示
 * - channel-select: Bot招待完了後、通知チャンネルを選択
 * - 招待済み: 接続済み状態を表示（チャンネル名 + 解除ボタン）
 */
export function DiscordSettingsSection({ teamId, isOperator }: DiscordSettingsSectionProps) {
  const { idToken } = useAuthStore();
  const searchParams = useSearchParams();
  const discordParam = searchParams.get('discord');
  const nonce = searchParams.get('nonce');

  const [config, setConfig] = useState<DiscordTeamConfig | null>(null);
  const [loadedTeamId, setLoadedTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // チャンネル選択モード用の state
  const [dismissedNonce, setDismissedNonce] = useState<string | null>(null);
  const [pendingGuildId, setPendingGuildId] = useState<string | null>(null);
  const [availableChannels, setAvailableChannels] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [savingChannel, setSavingChannel] = useState(false);

  // Sprint 1 Webhook 設定用の state（guildId 未設定時のみ表示）
  const [webhookUrl, setWebhookUrl] = useState('');
  const [notifyOnCreate, setNotifyOnCreate] = useState(false);
  const [notifyBefore1h, setNotifyBefore1h] = useState(false);
  const [notifyBefore15min, setNotifyBefore15min] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const loading = isOperator && loadedTeamId !== teamId;
  const pendingNonce =
    discordParam === 'channel-select' && nonce && nonce !== dismissedNonce ? nonce : null;

  // Admin SDK 経由で設定を取得（クライアントSDKのセキュリティルール問題を回避）
  const fetchConfig = useCallback(async (): Promise<DiscordTeamConfig | null> => {
    if (!idToken) return null;
    const res = await fetch(`/api/discord/get-config?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { config: DiscordTeamConfig | null };
    return data.config;
  }, [idToken, teamId]);

  // 設定を読み込む
  useEffect(() => {
    if (!isOperator || !idToken) return;
    let cancelled = false;

    fetchConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (cfg) {
          setWebhookUrl(cfg.webhookUrl ?? '');
          setNotifyOnCreate(cfg.notifyOnCreate);
          setNotifyBefore1h(cfg.notifyBefore1h);
          setNotifyBefore15min(cfg.notifyBefore15min);
        } else {
          setWebhookUrl('');
          setNotifyOnCreate(false);
          setNotifyBefore1h(false);
          setNotifyBefore15min(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('設定の読み込みに失敗しました');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadedTeamId(teamId);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [teamId, isOperator, idToken, fetchConfig]);

  // URL クエリパラメータから Bot 招待フローの状態を読み取る
  useEffect(() => {
    if (pendingNonce) {
      void fetchPendingChannels(pendingNonce);
      return;
    }

    if (discordParam === 'connected') {
      showToast('success', 'Discord Botを接続しました！');
      fetchConfig().then(setConfig).catch(() => {});
    } else if (discordParam === 'cancelled') {
      showToast('error', 'Bot招待がキャンセルされました');
    } else if (discordParam === 'error') {
      const reason = searchParams.get('reason');
      const messages: Record<string, string> = {
        'already-linked': 'このDiscordサーバーは既に別チームが使用中です',
        'invalid-nonce': '招待セッションが無効です。やり直してください',
        'nonce-expired': '招待セッションが期限切れです。やり直してください',
        'channel-fetch-failed': 'チャンネル一覧の取得に失敗しました',
        'invalid-params': '不正なパラメータです',
        'duplicate-check-failed': '連携状態の確認に失敗しました。時間をおいて再度お試しください',
      };
      showToast('error', messages[reason ?? ''] ?? 'エラーが発生しました');
    }
  }, [discordParam, pendingNonce, searchParams, teamId, fetchConfig]);

  async function fetchPendingChannels(nonce: string) {
    if (!idToken) {
      setError('ログイン状態を確認できません。再度ログインしてください。');
      return;
    }
    const res = await fetch(`/api/discord/pending-channels?nonce=${nonce}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) {
      setError('チャンネル一覧の取得に失敗しました');
      return;
    }
    const data = (await res.json()) as {
      guildId: string;
      channels: Array<{ id: string; name: string }>;
    };
    setPendingGuildId(data.guildId);
    setAvailableChannels(data.channels);
    if (data.channels[0]) {
      setSelectedChannelId(data.channels[0].id);
    }
  }

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleBotInvite() {
    if (!idToken) {
      setError('ログイン状態を確認できません。再度ログインしてください。');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/discord/bot-invite-start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? 'Bot招待の開始に失敗しました');
      }
      const { authUrl } = (await res.json()) as { authUrl: string };
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bot招待の開始に失敗しました');
    }
  }

  async function handleChannelSave() {
    if (!idToken || !pendingNonce || !pendingGuildId || !selectedChannelId) return;
    setSavingChannel(true);
    setError(null);
    try {
      const res = await fetch('/api/discord/save-guild-config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId,
          guildId: pendingGuildId,
          channelId: selectedChannelId,
          nonce: pendingNonce,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? '設定の保存に失敗しました');
      }
      setDismissedNonce(pendingNonce);
      setPendingGuildId(null);
      setAvailableChannels([]);
      showToast('success', 'Discord Botを接続しました！');
      const updated = await fetchConfig();
      setConfig(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setSavingChannel(false);
    }
  }

  async function handleDisconnect() {
    if (!idToken) return;
    setError(null);
    try {
      await updateDiscordSettings({
        teamId,
        webhookUrl: config?.webhookUrl ?? '',
        notifyOnCreate: config?.notifyOnCreate ?? false,
        notifyBefore1h: config?.notifyBefore1h ?? false,
        notifyBefore15min: config?.notifyBefore15min ?? false,
        // guildId と channelId を空文字で上書き（削除）
      });
      // guildId/channelId を Firestore から削除するために Admin SDK 経由の API を呼ぶ
      await fetch('/api/discord/disconnect-guild', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teamId }),
      });
      setConfig((prev) => (prev ? { ...prev, guildId: undefined, channelId: undefined } : null));
      showToast('success', 'Discord Bot の接続を解除しました');
    } catch {
      setError('解除に失敗しました');
    }
  }

  async function handleWebhookSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingWebhook(true);
    setError(null);
    try {
      await updateDiscordSettings({
        teamId,
        webhookUrl,
        notifyOnCreate,
        notifyBefore1h,
        notifyBefore15min,
      });
      showToast('success', 'Discord 通知設定を保存しました');
    } catch {
      showToast('error', '保存に失敗しました。もう一度お試しください。');
    } finally {
      setSavingWebhook(false);
    }
  }

  // operator 以外には表示しない
  if (!isOperator) return null;

  if (loading) {
    return (
      <Card noPadding>
        <CardHeader title="Discord 連携" />
        <div className="p-[18px]">
          <p className="text-[13px] text-muted">読み込み中...</p>
        </div>
      </Card>
    );
  }

  const isConnected = !!config?.guildId && !!config?.channelId;
  const isChannelSelectMode = !!pendingNonce && availableChannels.length > 0;

  return (
    <Card noPadding>
      <CardHeader title="Discord 連携" />
      <div className="p-[18px] space-y-5">
        <p className="text-[13px] text-muted">
          Discord サーバーに RisukeruGG Bot を追加すると、スケジュール通知や AI
          アシスタントが使えます。
        </p>

        {error && (
          <p className="text-[12px] text-live bg-live/10 border border-live/30 rounded-[8px] px-3 py-2">
            {error}
          </p>
        )}

        {toast && (
          <p
            className="text-[12px] rounded-[8px] px-3 py-2 border"
            style={{
              color: toast.type === 'success' ? 'var(--green)' : 'var(--live)',
              background: toast.type === 'success' ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              borderColor:
                toast.type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)',
            }}
          >
            {toast.message}
          </p>
        )}

        {/* ── 接続済み表示 ── */}
        {isConnected && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-surface">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                style={{ background: 'rgba(88,101,242,0.15)', color: '#5865F2' }}
              >
                🎮
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-text">Discord Bot 接続済み</p>
                <p className="text-[11px] text-muted">
                  サーバーID: {config.guildId} ／ チャンネルID: {config.channelId}
                </p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(74,222,128,0.15)', color: 'var(--green)' }}
              >
                接続済み
              </span>
            </div>
            <button
              onClick={handleDisconnect}
              className="text-[12px] text-muted hover:text-live transition-colors"
            >
              接続を解除する
            </button>
          </div>
        )}

        {/* ── チャンネル選択モード ── */}
        {!isConnected && isChannelSelectMode && (
          <div className="space-y-4">
            <div className="p-3 rounded-[10px] border border-border bg-surface">
              <p className="text-[12px] font-semibold text-text mb-1">
                ✅ Bot がサーバーに参加しました
              </p>
              <p className="text-[11px] text-muted">通知を送るチャンネルを選択してください</p>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-text mb-2">通知チャンネル</p>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full bg-surface border border-border rounded-[8px] px-3 py-2 text-[13px] text-text focus:outline-none focus:border-purple"
              >
                {availableChannels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={handleChannelSave}
              loading={savingChannel}
              disabled={!selectedChannelId}
              size="sm"
            >
              保存する
            </Button>
          </div>
        )}

        {/* ── 未招待: Bot 招待ボタン ── */}
        {!isConnected && !isChannelSelectMode && (
          <div className="space-y-4">
            <Button
              onClick={handleBotInvite}
              variant="secondary"
              size="sm"
              style={{
                background: 'rgba(88,101,242,0.15)',
                color: '#5865F2',
                borderColor: 'rgba(88,101,242,0.4)',
              }}
            >
              <span className="mr-1.5">🎮</span>
              Botをサーバーに追加
            </Button>

            {/* Sprint 1 フォールバック: Webhook URL 設定 */}
            <details className="text-[12px] text-muted">
              <summary className="cursor-pointer hover:text-text transition-colors">
                Webhook URL で通知する（旧方式）
              </summary>
              <form onSubmit={handleWebhookSave} className="mt-3 space-y-4">
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
                <Button type="submit" size="sm" loading={savingWebhook}>
                  保存する
                </Button>
              </form>
            </details>
          </div>
        )}

        {/* ── 接続済みの場合の通知設定トグル ── */}
        {isConnected && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-[12px] font-semibold text-text">通知タイミング</p>
            <ToggleRow
              label="スケジュール作成時に通知"
              checked={notifyOnCreate}
              onChange={async (v) => {
                setNotifyOnCreate(v);
                await updateDiscordSettings({
                  teamId,
                  webhookUrl: config?.webhookUrl ?? '',
                  notifyOnCreate: v,
                  notifyBefore1h,
                  notifyBefore15min,
                }).catch(() => {});
              }}
            />
            <ToggleRow
              label="開始 1 時間前にリマインダー"
              checked={notifyBefore1h}
              onChange={async (v) => {
                setNotifyBefore1h(v);
                await updateDiscordSettings({
                  teamId,
                  webhookUrl: config?.webhookUrl ?? '',
                  notifyOnCreate,
                  notifyBefore1h: v,
                  notifyBefore15min,
                }).catch(() => {});
              }}
            />
            <ToggleRow
              label="開始 15 分前にリマインダー"
              checked={notifyBefore15min}
              onChange={async (v) => {
                setNotifyBefore15min(v);
                await updateDiscordSettings({
                  teamId,
                  webhookUrl: config?.webhookUrl ?? '',
                  notifyOnCreate,
                  notifyBefore1h,
                  notifyBefore15min: v,
                }).catch(() => {});
              }}
            />
          </div>
        )}
      </div>
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
        className="relative shrink-0 w-10 h-6 rounded-full transition-colors focus:outline-none p-0 overflow-hidden"
        style={{ background: checked ? 'var(--purple)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{ transform: checked ? 'translateX(16px)' : 'translateX(0px)' }}
        />
      </button>
    </label>
  );
}
