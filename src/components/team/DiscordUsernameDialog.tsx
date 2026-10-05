'use client';

/**
 * メンバーの Discord ユーザー名を登録・変更・解除するダイアログ（TE-012）。
 *
 * 本人（個人設定）とオペレーター（チーム管理）の両方から使う。
 * ログイン連携は行わず、ユーザー名だけを保持して送信時に Bot が ID に解決する。
 */

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { updateMemberDiscordUsername } from '@/lib/repositories/teams';
import { discordUsernameSchema, normalizeDiscordUsername } from '@/lib/validations/team';
import type { TeamMember } from '@/types/entities';

interface DiscordUsernameDialogProps {
  teamId: string;
  member: TeamMember;
  onClose: () => void;
}

export function DiscordUsernameDialog({ teamId, member, onClose }: DiscordUsernameDialogProps) {
  const [value, setValue] = useState(member.discordUsername ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(next: string | null) {
    setSaving(true);
    setError(null);
    try {
      await updateMemberDiscordUsername(teamId, member.userId, next);
      onClose();
    } catch {
      setError('保存に失敗しました。時間をおいて再度お試しください');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeDiscordUsername(value);
    if (normalized === null) {
      // 空で保存 = 解除
      await save(null);
      return;
    }
    const parsed = discordUsernameSchema.safeParse(normalized);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '形式が正しくありません');
      return;
    }
    await save(parsed.data);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${member.displayName} の Discord ユーザー名`}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          {member.discordUsername && (
            <Button variant="secondary" size="sm" onClick={() => save(null)} disabled={saving}>
              解除する
            </Button>
          )}
          <Button size="sm" form="discord-username-form" type="submit" loading={saving}>
            保存する
          </Button>
        </>
      }
    >
      <form id="discord-username-form" onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Discord ユーザー名"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder="例: risu_gg"
          maxLength={33}
          autoFocus
          error={error ?? undefined}
          hint="Discord の「@」の後ろに表示される一意のユーザー名（表示名ではありません）。登録すると Discord 通知でメンションされます。"
        />
      </form>
    </Modal>
  );
}
