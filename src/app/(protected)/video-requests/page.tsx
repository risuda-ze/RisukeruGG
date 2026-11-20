'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { DateInput } from '@/components/ui/DateInput';
import { Dropdown } from '@/components/ui/Dropdown';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';
import { subscribeColumns } from '@/lib/repositories/taskStatuses';
import { approveVideoRequest, createVideoRequest, requestVideoRevision, subscribeVideoRequests } from '@/lib/repositories/videoRequests';
import { VIDEO_REQUEST_STATUS_LABELS, type VideoRequest } from '@/types/videoRequests';
import type { TaskStatus } from '@/types/entities';

const dateLabel = (date: Date | null) =>
  date ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date) : '未設定';

export default function VideoRequestsPage() {
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [columns, setColumns] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!currentTeam) return;
    const unsubs = [
      subscribeVideoRequests(currentTeam.id, (items) => { setRequests(items); setLoading(false); }),
      subscribeColumns(currentTeam.id, setColumns),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [currentTeam]);

  if (!currentTeam) return <div className="flex-1 p-6 text-sm text-muted">チームに参加すると動画依頼を管理できます。</div>;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="動画依頼" subtitle="依頼・納品・修正依頼をDiscordと同期します">
        <Button size="sm" onClick={() => setShowForm((open) => !open)}>{showForm ? '閉じる' : '動画を依頼する'}</Button>
      </TopBar>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 space-y-5">
        {showForm && <VideoRequestForm teamId={currentTeam.id} columns={columns} onCreated={() => setShowForm(false)} />}
        {loading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : requests.length === 0 ? (
          <Card className="text-center py-10 text-sm text-muted">まだ動画依頼はありません。</Card>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
            {requests.map((request) => <VideoRequestCard key={request.id} request={request} teamId={currentTeam.id} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function VideoRequestForm({ teamId, columns, onCreated }: { teamId: string; columns: TaskStatus[]; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [editorIds, setEditorIds] = useState('');
  const [videoType, setVideoType] = useState<'long' | 'short'>('long');
  const [summary, setSummary] = useState('');
  const [projectManagementUrl, setProjectManagementUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [titleIdea, setTitleIdea] = useState('');
  const [startAt, setStartAt] = useState('');
  const [firstDraftDueAt, setFirstDraftDueAt] = useState('');
  const [finalPackageDueAt, setFinalPackageDueAt] = useState('');
  const [taskColumnId, setTaskColumnId] = useState(columns[0]?.id ?? '');
  const [reviewTaskColumnId, setReviewTaskColumnId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveTaskColumnId = taskColumnId || columns[0]?.id || '';
  const effectiveReviewTaskColumnId = reviewTaskColumnId || columns.find((column) => column.name === '見てくれぃ')?.id || '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const editorDiscordIds = editorIds.split(/[、,\s]+/).map((id) => id.trim()).filter(Boolean);
    if (!effectiveTaskColumnId || !effectiveReviewTaskColumnId) return setError('依頼時と納品時のタスク状態を選択してください');
    if (videoType === 'long' && (!firstDraftDueAt || !finalPackageDueAt)) {
      return setError('横動画では初稿納期と完パケ納期を入力してください');
    }
    setSaving(true);
    try {
      await createVideoRequest({
        teamId, title: title.trim(), editorDiscordIds, videoType, summary: summary.trim(),
        projectManagementUrl: projectManagementUrl.trim() || null, notes: notes.trim() || null,
        titleIdea: titleIdea.trim() || null, startAt: startAt || null,
        firstDraftDueAt: videoType === 'long' ? firstDraftDueAt || null : null,
        finalPackageDueAt: videoType === 'long' ? finalPackageDueAt || null : null,
        taskColumnId: effectiveTaskColumnId,
        reviewTaskColumnId: effectiveReviewTaskColumnId,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : '動画依頼の作成に失敗しました');
    } finally { setSaving(false); }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-bold text-text">動画を依頼する</h2>
        {error && <p className="text-xs text-live">{error}</p>}
        <Input label="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required placeholder="Discordスレッド名になります" />
        <Input label="担当編集者のDiscordユーザーID" value={editorIds} onChange={(e) => setEditorIds(e.target.value)} required hint="複数人はカンマ区切り。Discordの開発者モードでコピーできます" />
        <Dropdown value={videoType} onChange={(value) => setVideoType(value as 'long' | 'short')} options={[{ value: 'long', label: '横動画' }, { value: 'short', label: 'ショート動画' }]} />
        <Textarea label="概要" value={summary} onChange={(e) => setSummary(e.target.value)} required rows={4} maxLength={4000} />
        <Input label="プロマネのリンク" value={projectManagementUrl} onChange={(e) => setProjectManagementUrl(e.target.value)} type="url" placeholder="https://" />
        <Textarea label="共有事項" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} />
        <Input label="タイトル案（仮）" value={titleIdea} onChange={(e) => setTitleIdea(e.target.value)} maxLength={200} hint="サムネ用スレッドへ投稿します" />
        <DateInput label="編集開始日" value={startAt} onChange={setStartAt} />
        {videoType === 'long' && <div className="grid gap-3 md:grid-cols-2"><DateInput label="初稿納期" value={firstDraftDueAt} onChange={setFirstDraftDueAt} /><DateInput label="完パケ納期" value={finalPackageDueAt} onChange={setFinalPackageDueAt} hint="サムネイル納期にも使います" /></div>}
        <div className="grid gap-3 md:grid-cols-2"><div><span className="mb-1 block text-sm font-medium text-text">依頼時のタスク状態</span><Dropdown value={effectiveTaskColumnId} onChange={setTaskColumnId} options={columns.map((column) => ({ value: column.id, label: column.name }))} /></div><div><span className="mb-1 block text-sm font-medium text-text">納品時のタスク状態</span><Dropdown value={effectiveReviewTaskColumnId} onChange={setReviewTaskColumnId} options={columns.map((column) => ({ value: column.id, label: column.name }))} /></div></div>
        <Button type="submit" loading={saving}>依頼を作成してDiscordへ送る</Button>
      </form>
    </Card>
  );
}

function VideoRequestCard({ request, teamId }: { request: VideoRequest; teamId: string }) {
  const [revision, setRevision] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function revise() {
    if (!revision.trim()) return;
    setBusy(true); setError(null);
    try { await requestVideoRevision({ teamId, videoRequestId: request.id, message: revision.trim() }); setRevision(''); }
    catch (err) { setError(err instanceof Error ? err.message : '修正依頼に失敗しました'); }
    finally { setBusy(false); }
  }
  async function approve() {
    setBusy(true); setError(null);
    try { await approveVideoRequest({ teamId, videoRequestId: request.id }); }
    catch (err) { setError(err instanceof Error ? err.message : '完了処理に失敗しました'); }
    finally { setBusy(false); }
  }
  return <Card className="space-y-3">
    <div className="flex justify-between gap-3"><h2 className="font-bold text-text">{request.title}</h2><span className="ds-badge ds-badge--primary">{VIDEO_REQUEST_STATUS_LABELS[request.status]}</span></div>
    <p className="text-sm text-text-2 whitespace-pre-wrap line-clamp-3">{request.summary}</p>
    <div className="text-xs text-muted space-y-1"><p>初稿: {dateLabel(request.firstDraftDueAt)}　完パケ: {dateLabel(request.finalPackageDueAt)}</p><p>Discord: {request.discord.status === 'created' ? 'スレッド作成済み' : request.discord.status === 'failed' ? '作成失敗' : 'Bot処理待ち'}</p>{request.deliveryUrls.length > 0 && <p>納品URL: {request.deliveryUrls.length}件</p>}</div>
    {request.discord.editorThreadUrls.map((url) => <a key={url} className="text-xs text-purple-l hover:underline block truncate" href={url} target="_blank" rel="noreferrer">編集スレッドを開く</a>)}
    {request.status !== 'completed' && <div className="space-y-2 pt-2 border-t border-border"><Textarea value={revision} onChange={(e) => setRevision(e.target.value)} rows={2} placeholder="修正内容を入力するとDiscordへ自動投稿します" maxLength={2000} /><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!revision.trim() || busy} onClick={revise}>修正を依頼</Button><Button size="sm" variant="success" disabled={busy} onClick={approve}>承認して完了</Button></div></div>}
    {error && <p className="text-xs text-live">{error}</p>}
  </Card>;
}
