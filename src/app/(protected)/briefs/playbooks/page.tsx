'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { useBriefsStore } from '@/stores/briefs';
import { useBriefOps } from '@/hooks/useBriefOps';
import { createPlaybook, deletePlaybook, updatePlaybook } from '@/lib/repositories/playbooks';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { PlaybookEditor } from '@/components/briefs/PlaybookEditor';
import type { Playbook } from '@/types/briefs';

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; playbook: Playbook };

const ORIGIN_LABELS: Record<Playbook['origin'], string> = {
  dialogue: '対話で作成',
  manual: '手で作成',
  derived: 'ブリーフから作成',
};

/**
 * 進め方設定（/briefs/playbooks）。チーム固有の工程の型を一覧・編集する。
 */
export default function PlaybooksPage() {
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const playbooks = useBriefsStore((s) => s.playbooks);
  const loading = useBriefsStore((s) => s.loading);
  const subscribe = useBriefsStore((s) => s.subscribe);
  const briefOps = useBriefOps();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [error, setError] = useState<string | null>(null);

  const teamId = currentTeam?.id;
  useEffect(() => {
    if (!teamId) return;
    return subscribe(teamId);
  }, [teamId, subscribe]);

  async function handleDelete(p: Playbook) {
    if (!teamId || !confirm(`進め方「${p.name}」を削除しますか？作成済みのブリーフには影響しません`)) return;
    try {
      await deletePlaybook(teamId, p.id);
    } catch {
      setError('削除に失敗しました');
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="進め方" subtitle="チームの工程の型。新しいブリーフはここから工程が埋まります">
        <div className="flex items-center gap-2">
          <Link href="/briefs" className="btn btn--secondary btn--sm">
            <Icon name="arrow_back" size={14} />
            ブリーフ一覧
          </Link>
          {briefOps.canEdit && editor.mode === 'closed' && (
            <Button size="sm" onClick={() => setEditor({ mode: 'new' })}>
              <Icon name="add" size={14} />
              進め方を作る
            </Button>
          )}
        </div>
      </TopBar>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl space-y-4">
        {error && <p className="text-[12px] text-live">{error}</p>}

        {editor.mode !== 'closed' && teamId && (
          <Card>
            <CardHeader title={editor.mode === 'new' ? '新しい進め方' : `「${editor.playbook.name}」を編集`} />
            <PlaybookEditor
              initial={editor.mode === 'edit' ? editor.playbook : null}
              members={members}
              onCancel={() => setEditor({ mode: 'closed' })}
              onSave={async (input) => {
                if (editor.mode === 'new') {
                  await createPlaybook(teamId, input);
                } else {
                  await updatePlaybook(teamId, editor.playbook.id, input);
                }
                setEditor({ mode: 'closed' });
              }}
            />
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : playbooks.length === 0 && editor.mode === 'closed' ? (
          <Card className="text-center py-10">
            <p className="text-sm text-text mb-1">進め方がまだありません</p>
            <p className="text-[12px] text-muted mb-4">
              動画1本の工程（構成確認 → 編集 → サムネ → 告知 など）と、担当・公開日からの日数・必要な情報を一度決めておくと、次からは公開日を入れるだけで1枚紙ができます。
            </p>
            {briefOps.canEdit && (
              <Button size="sm" onClick={() => setEditor({ mode: 'new' })}>
                進め方を作る
              </Button>
            )}
          </Card>
        ) : (
          <ul className="space-y-3">
            {playbooks.map((p) => (
              <li key={p.id}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-text">{p.name}</h3>
                      <p className="text-[11px] text-muted">
                        v{p.version} ・ {ORIGIN_LABELS[p.origin]} ・ {p.steps.length} 工程
                      </p>
                    </div>
                    {briefOps.canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="secondary" onClick={() => setEditor({ mode: 'edit', playbook: p })}>
                          編集
                        </Button>
                        <button type="button" onClick={() => handleDelete(p)} aria-label="削除" className="btn btn--ghost btn--icon btn--sm">
                          <Icon name="delete_outline" size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <ol className="flex flex-wrap items-center gap-1 text-[12px] text-text-2">
                    {p.steps.map((s, i) => {
                      const assignee = members.find((m) => m.userId === s.defaultAssigneeId);
                      return (
                        <li key={s.key} className="flex items-center gap-1">
                          {i > 0 && <Icon name="chevron_right" size={12} className="text-muted" />}
                          <span className="text-text">{s.title}</span>
                          <span className="text-muted">
                            ({assignee?.displayName ?? s.roleLabel ?? '未定'} / {s.leadDays}日前)
                          </span>
                          {s.optional && <Badge variant="neutral">任意</Badge>}
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
