'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * ユーザー設定画面の Discord アカウント連携セクション。
 * 連携済み/未連携を auth store の discordInfo で判定して表示を切り替える。
 */
export function DiscordConnectSection() {
  const { currentUser, idToken, discordInfo } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    if (!idToken) {
      setError('ログイン状態を確認できません。再度ログインしてください。');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/discord/link-start', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? '連携の開始に失敗しました');
      }
      const { authUrl } = (await res.json()) as { authUrl: string };
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : '連携の開始に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      // Firestore Security Rules: users/{uid} は本人のみ書き込み可能
      await updateDoc(doc(db, 'users', currentUser.uid), { discord: null });
    } catch {
      setError('連携の解除に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card noPadding>
      <CardHeader title="Discord 連携" />
      <div className="p-[18px] space-y-4">
        <p className="text-[13px] text-muted">
          Discord アカウントを連携すると、Discord ボットから RisukeruGG の AI アシスタントを使用できます。
        </p>

        {error && (
          <p className="text-[12px] text-live bg-live/10 border border-live/30 rounded-[8px] px-3 py-2">
            {error}
          </p>
        )}

        {discordInfo ? (
          /* 連携済み */
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-surface">
              <span className="text-2xl">🎮</span>
              <div>
                <p className="text-[13px] font-semibold text-text">{discordInfo.username}</p>
                <p className="text-[11px] text-muted">Discord アカウント連携済み</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-[12px] text-muted hover:text-live transition-colors"
            >
              {loading ? '解除中...' : '連携を解除する'}
            </button>
          </div>
        ) : (
          /* 未連携 */
          <div className="space-y-3">
            <Button
              onClick={handleConnect}
              loading={loading}
              variant="secondary"
              size="sm"
              style={{
                background: 'rgba(88,101,242,0.15)',
                color: '#5865F2',
                borderColor: 'rgba(88,101,242,0.4)',
              }}
            >
              <span className="mr-1.5">🎮</span>
              Discordと連携する
            </Button>
            <p className="text-[11px] text-muted">
              ※ この機能は Sprint 3（AI ボット）で使用します。連携後も Discord ボットのセットアップが別途必要です。
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
