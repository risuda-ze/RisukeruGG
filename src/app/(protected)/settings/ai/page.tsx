'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { subscribeTeamAiSettings, saveTeamAiSettings, EMPTY_AI_SETTINGS } from '@/lib/repositories/aiSettings';
import { teamAiSettingsSchema, AI_PRESETS_MAX } from '@/lib/validations/ai';
import { AI_CAPABILITIES, STAGE_LABELS, SURFACE_LABELS } from '@/lib/ai/capabilities/registry';
import { getPromptTemplate } from '@/lib/ai/prompts/manifest';
import { TEAM_INSTRUCTIONS_MAX } from '@/lib/ai/systemPrompt';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Icon } from '@/components/ui/Icon';
import type { AiPreset, TeamAiSettings } from '@/types/entities';

const STAGE_VARIANT = { available: 'success', planned: 'info', deferred: 'neutral' } as const;

/**
 * AI 設定（/settings/ai。AI-020〜AI-023）。
 * 「AI に何ができるか」の一覧、チームからの追加指示、定型指示を管理する。
 */
export default function AiSettingsPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const teamId = currentTeam?.id;
  const isOperator = members.find((m) => m.userId === currentUser?.uid)?.role === 'operator';

  const [saved, setSaved] = useState<TeamAiSettings>(EMPTY_AI_SETTINGS);
  const [instructions, setInstructions] = useState('');
  const [presets, setPresets] = useState<AiPreset[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!teamId) return;
    return subscribeTeamAiSettings(teamId, (s) => {
      setSaved(s);
      // 編集中でなければ保存値に追従する（他のオペレーターの変更を反映）
      setDirty((d) => {
        if (!d) {
          setInstructions(s.teamInstructions);
          setPresets(s.presets);
        }
        return d;
      });
    });
  }, [teamId]);

  function updatePreset(i: number, patch: Partial<AiPreset>) {
    setPresets((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
    setDirty(true);
  }

  async function handleSave() {
    if (!teamId) return;
    const parsed = teamAiSettingsSchema.safeParse({ teamInstructions: instructions, presets });
    if (!parsed.success) {
      setMessage({ type: 'error', text: parsed.error.issues[0]?.message ?? '入力内容を確認してください' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveTeamAiSettings(teamId, parsed.data);
      setDirty(false);
      setMessage({ type: 'success', text: '保存しました' });
    } catch {
      setMessage({ type: 'error', text: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="AI設定" subtitle="AI にできることの一覧と、チーム固有の指示" />
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl space-y-6">
        {/* 能力の一覧 */}
        <Card noPadding>
          <div className="px-4 pt-4">
            <CardHeader title="AI にできること" />
          </div>
          <ul className="divide-y divide-border">
            {AI_CAPABILITIES.map((c) => {
              const prompt = c.promptId ? getPromptTemplate(c.promptId) : undefined;
              return (
                <li key={c.id} className="px-4 py-3 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text">{c.name}</span>
                    <Badge variant={STAGE_VARIANT[c.stage]}>
                      {STAGE_LABELS[c.stage]}
                      {c.plannedIn ? `（${c.plannedIn}）` : ''}
                    </Badge>
                    {c.surfaces.map((s) => (
                      <Badge key={s} variant="neutral">
                        {SURFACE_LABELS[s]}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed">{c.description}</p>
                  {c.note && <p className="text-[11px] text-text-muted">{c.note}</p>}
                  {prompt && (
                    <p className="text-[11px] text-text-muted">
                      プロンプト: {prompt.name} v{prompt.version}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="px-4 py-3 text-[11px] text-text-muted border-t border-border">
            入力欄は 1 つで、どの能力を使うかは AI が判断します。提案はすべて確認してから登録されます。
          </p>
        </Card>

        {/* チームからの追加指示 */}
        <Card className="space-y-3">
          <CardHeader title="チームからの追加指示" />
          <p className="text-[12px] text-text-muted">
            用語・呼び方・優先したい書き方など、このチームの AI に共通で伝えたいことを書きます（{TEAM_INSTRUCTIONS_MAX}文字以内）。対応範囲や提案の形式を変える指示は無視されます。
          </p>
          <Textarea
            value={instructions}
            onChange={(e) => {
              setInstructions(e.target.value);
              setDirty(true);
            }}
            rows={5}
            maxLength={TEAM_INSTRUCTIONS_MAX}
            placeholder="例: 「配信」は「枠」と呼ぶ。担当者の呼び方は「さん」付け。タスク名は動詞で終える。"
            disabled={!isOperator}
          />
          <p className="text-[11px] text-text-muted text-right">
            {instructions.length} / {TEAM_INSTRUCTIONS_MAX}
          </p>
        </Card>

        {/* 定型指示 */}
        <Card className="space-y-3">
          <CardHeader
            title="定型指示"
            action={
              isOperator ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={presets.length >= AI_PRESETS_MAX}
                  onClick={() => {
                    setPresets((prev) => [...prev, { id: crypto.randomUUID().slice(0, 8), name: '', body: '' }]);
                    setDirty(true);
                  }}
                >
                  <Icon name="add" size={14} />
                  追加
                </Button>
              ) : undefined
            }
          />
          <p className="text-[12px] text-text-muted">
            繰り返し使う決まり文句を登録します。Web の「AIに相談」ではチップとして、Discord では{' '}
            <code className="text-[11px]">/risukerugg</code> の「preset」候補として選べます（最大 {AI_PRESETS_MAX} 件）。
          </p>
          {presets.length === 0 && <p className="text-[12px] text-text-muted">まだ登録されていません</p>}
          <ul className="space-y-3">
            {presets.map((p, i) => (
              <li key={p.id} className="rounded-[12px] border border-border p-3 space-y-2" style={{ background: 'var(--bg)' }}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="名前"
                      value={p.name}
                      onChange={(e) => updatePreset(i, { name: e.target.value })}
                      placeholder="例: 今週の締切"
                      maxLength={30}
                      disabled={!isOperator}
                    />
                  </div>
                  {isOperator && (
                    <button
                      type="button"
                      onClick={() => {
                        setPresets((prev) => prev.filter((_, idx) => idx !== i));
                        setDirty(true);
                      }}
                      aria-label="定型指示を削除"
                      className={buttonVariants({ variant: 'subtle', size: 'icon-sm' })}
                    >
                      <Icon name="delete_outline" size={16} />
                    </button>
                  )}
                </div>
                <Textarea
                  label="本文"
                  value={p.body}
                  onChange={(e) => updatePreset(i, { body: e.target.value })}
                  rows={2}
                  maxLength={500}
                  placeholder="例: 今週締切のタスクを担当者ごとにまとめて"
                  disabled={!isOperator}
                />
              </li>
            ))}
          </ul>
        </Card>

        {message && (
          <p className="text-[12px]" style={{ color: message.type === 'success' ? 'var(--green)' : 'var(--live)' }}>
            {message.text}
          </p>
        )}
        {isOperator ? (
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving} disabled={!dirty}>
              保存する
            </Button>
            {saved.updatedAt && (
              <span className="text-[11px] text-text-muted">最終更新 {saved.updatedAt.toLocaleString('ja-JP')}</span>
            )}
          </div>
        ) : (
          <p className="text-[12px] text-text-muted">編集はオペレーターのみ行えます</p>
        )}
      </div>
    </div>
  );
}
