'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Dropdown } from '@/components/ui/Dropdown';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/auth';
import {
  approveVideoRequest,
  addVideoOwnerResourceUrl,
  createVideoRequest,
  requestVideoRevision,
  retryVideoRequestDiscord,
  reviewThumbnail,
  subscribeVideoRequests,
  updateVideoRequest,
} from '@/lib/repositories/videoRequests';
import { VIDEO_REQUEST_STATUS_LABELS, type VideoRequest } from '@/types/videoRequests';

const dateLabel = (date: Date | null) =>
  date
    ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date)
    : '未設定';

export default function VideoRequestsPage() {
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const currentUser = useAuthStore((s) => s.currentUser);
  const members = useAuthStore((s) => s.members);
  const [requests, setRequests] = useState<VideoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<VideoRequest | null>(null);
  const canManageVideoRequests =
    members.find((member) => member.userId === currentUser?.uid)?.role === 'member';

  useEffect(() => {
    if (!currentTeam) return;
    const unsubs = [
      subscribeVideoRequests(
        currentTeam.id,
        (items) => {
          setRequests(items);
          setLoadError(null);
          setLoading(false);
        },
        (error) => {
          setLoadError(error.message || '動画依頼の読み込みに失敗しました');
          setLoading(false);
        }
      ),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [currentTeam]);

  if (!currentTeam)
    return (
      <div className="flex-1 p-6 text-sm text-muted">
        チームに参加すると動画依頼を管理できます。
      </div>
    );

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="動画依頼" subtitle="依頼・納品・修正依頼をDiscordと同期します">
        <Button
          size="sm"
          disabled={!canManageVideoRequests}
          onClick={() => {
            setEditingRequest(null);
            setShowForm((open) => !open);
          }}
        >
          {showForm ? '閉じる' : '動画を依頼する'}
        </Button>
      </TopBar>
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 space-y-5">
        {showForm && (
          <VideoRequestForm
            key={editingRequest?.id ?? 'new'}
            teamId={currentTeam.id}
            request={editingRequest}
            onSaved={() => {
              setShowForm(false);
              setEditingRequest(null);
            }}
          />
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : loadError ? (
          <Card className="space-y-3 py-10 text-center text-sm text-muted">
            <p>動画依頼の読み込みに失敗しました。</p>
            <p className="text-xs">{loadError}</p>
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>
              再読み込み
            </Button>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="text-center py-10 text-sm text-muted">まだ動画依頼はありません。</Card>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}
          >
            {requests.map((request) => (
              <VideoRequestCard
                key={request.id}
                request={request}
                teamId={currentTeam.id}
                canManageResources={canManageVideoRequests}
                onEdit={() => {
                  setEditingRequest(request);
                  setShowForm(true);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function toDateInputValue(date: Date | null) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function VideoRequestForm({
  teamId,
  request,
  onSaved,
}: {
  teamId: string;
  request: VideoRequest | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(request?.title ?? '');
  const initialEditorIds = request?.editorDiscordIds.join(', ') ?? '';
  const [editorInput, setEditorInput] = useState(initialEditorIds);
  const [videoType, setVideoType] = useState<'long' | 'short'>(request?.videoType ?? 'long');
  const [summary, setSummary] = useState(request?.summary ?? '');
  const [projectManagementUrl, setProjectManagementUrl] = useState(
    request?.projectManagementUrl ?? ''
  );
  const [notes, setNotes] = useState(request?.notes ?? '');
  const [titleIdea, setTitleIdea] = useState(request?.titleIdea ?? '');
  const [startAt, setStartAt] = useState(toDateInputValue(request?.startAt ?? null));
  const [firstDraftDueAt, setFirstDraftDueAt] = useState(
    toDateInputValue(request?.firstDraftDueAt ?? null)
  );
  const [finalPackageDueAt, setFinalPackageDueAt] = useState(
    toDateInputValue(request?.finalPackageDueAt ?? null)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 日付入力は YYYY-MM-DD 形式のため、文字列の順序は日付順と一致する。
  const draftError =
    firstDraftDueAt && startAt && firstDraftDueAt < startAt
      ? '初稿納期は編集開始日以降の日付を指定してください'
      : undefined;
  const finalError =
    finalPackageDueAt && startAt && finalPackageDueAt < startAt
      ? '完パケ納期は編集開始日以降の日付を指定してください'
      : finalPackageDueAt && firstDraftDueAt && finalPackageDueAt < firstDraftDueAt
        ? '完パケ納期は初稿納期以降の日付を指定してください'
        : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (draftError || finalError) return;
    setError(null);
    const editorDiscordIds = [...new Set(editorInput.split(/[\s,、，]+/).filter(Boolean))];
    const keepLegacyEditors = Boolean(
      request?.editorMemberIds.length && editorInput === initialEditorIds
    );
    if (
      !keepLegacyEditors &&
      (!editorDiscordIds.length || editorDiscordIds.some((id) => !/^\d{17,20}$/.test(id)))
    ) {
      return setError('担当編集者のDiscordユーザーIDを17〜20桁の半角数字で入力してください');
    }
    if (!firstDraftDueAt || !finalPackageDueAt) {
      return setError('初稿納期と完パケ納期を入力してください');
    }
    setSaving(true);
    try {
      const input = {
        teamId,
        title: title.trim(),
        ...(keepLegacyEditors
          ? { editorMemberIds: request!.editorMemberIds }
          : { editorDiscordIds }),
        videoType,
        summary: summary.trim(),
        projectManagementUrl: projectManagementUrl.trim() || null,
        notes: notes.trim() || null,
        titleIdea: titleIdea.trim() || null,
        startAt: startAt || null,
        firstDraftDueAt: firstDraftDueAt || null,
        finalPackageDueAt: finalPackageDueAt || null,
      };
      if (request) await updateVideoRequest({ ...input, videoRequestId: request.id });
      else await createVideoRequest(input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '動画依頼の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="font-bold text-text">{request ? '動画依頼を編集する' : '動画を依頼する'}</h2>
        {error && <p className="text-xs text-live">{error}</p>}
        <Input
          label="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
          placeholder="Discordスレッド名になります"
        />
        <Input
          label="担当編集者のDiscordユーザーID"
          value={editorInput}
          onChange={(e) => setEditorInput(e.target.value)}
          hint={
            request?.editorMemberIds.length && !initialEditorIds
              ? '空欄のまま保存すると、登録済みの担当編集者を引き継ぎます。'
              : 'DiscordでコピーしたユーザーIDを入力してください。複数人はカンマで区切れます。'
          }
          placeholder="例：123456789012345678"
        />
        <Dropdown
          value={videoType}
          onChange={(value) => setVideoType(value as 'long' | 'short')}
          options={[
            { value: 'long', label: '横動画' },
            { value: 'short', label: 'ショート動画' },
          ]}
        />
        <Textarea
          label="概要"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          rows={4}
          maxLength={4000}
        />
        <Input
          label="プロマネのリンク"
          value={projectManagementUrl}
          onChange={(e) => setProjectManagementUrl(e.target.value)}
          type="url"
          placeholder="https://"
          required
        />
        <Textarea
          label="共有事項"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={2000}
        />
        <Input
          label="タイトル案（仮）"
          value={titleIdea}
          onChange={(e) => setTitleIdea(e.target.value)}
          maxLength={200}
          hint="サムネ用スレッドへ投稿します"
          required
        />
        <Input
          type="date"
          label="編集開始日"
          value={startAt}
          onChange={(event) => setStartAt(event.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            type="date"
            label="初稿納期"
            value={firstDraftDueAt}
            onChange={(event) => setFirstDraftDueAt(event.target.value)}
            error={draftError}
          />
          <Input
            type="date"
            label="完パケ納期"
            error={finalError}
            value={finalPackageDueAt}
            onChange={(event) => setFinalPackageDueAt(event.target.value)}
            hint="サムネイル納期にも使います"
          />
        </div>
        <Button type="submit" loading={saving} disabled={Boolean(draftError || finalError)}>
          {request ? '変更を保存してDiscordへ通知' : '依頼を作成してDiscordへ送る'}
        </Button>
      </form>
    </Card>
  );
}

function VideoRequestCard({
  request,
  teamId,
  canManageResources,
  onEdit,
}: {
  request: VideoRequest;
  teamId: string;
  canManageResources: boolean;
  onEdit: () => void;
}) {
  const [revision, setRevision] = useState('');
  const [thumbnailRevision, setThumbnailRevision] = useState('');
  async function reviewThumb(action: 'revise' | 'approve') {
    setBusy(true);
    setError(null);
    try {
      await reviewThumbnail({
        teamId,
        videoRequestId: request.id,
        action,
        message: thumbnailRevision,
      });
      setThumbnailRevision('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'サムネの確認結果を保存できませんでした');
    } finally {
      setBusy(false);
    }
  }
  const [ownerResourceUrl, setOwnerResourceUrl] = useState('');
  const [showOwnerResourceForm, setShowOwnerResourceForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function revise() {
    if (!revision.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestVideoRevision({ teamId, videoRequestId: request.id, message: revision.trim() });
      setRevision('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '修正依頼に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    setBusy(true);
    setError(null);
    try {
      await approveVideoRequest({ teamId, videoRequestId: request.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : '完了処理に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  async function addOwnerResourceUrl() {
    if (!ownerResourceUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await addVideoOwnerResourceUrl({
        teamId,
        videoRequestId: request.id,
        url: ownerResourceUrl.trim(),
      });
      setOwnerResourceUrl('');
      setShowOwnerResourceForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '共有資料URLの登録に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  async function retryDiscord() {
    setBusy(true);
    setError(null);
    try {
      await retryVideoRequestDiscord({ teamId, videoRequestId: request.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Discordへの再送信に失敗しました');
    } finally {
      setBusy(false);
    }
  }
  const createdThreadCount =
    request.discord.editorThreadUrls.length + (request.discord.thumbnailThreadUrl ? 1 : 0);
  return (
    <Card className="space-y-3">
      <div className="flex justify-between gap-3">
        <h2 className="font-bold text-text">{request.title}</h2>
        <span className="ds-badge ds-badge--primary">
          {VIDEO_REQUEST_STATUS_LABELS[request.status]}
        </span>
      </div>
      <p className="text-sm text-text-2 whitespace-pre-wrap line-clamp-3">{request.summary}</p>
      {request.thumbnailStatus && (
        <section className="space-y-2 rounded-sm border border-border p-3">
          <h3 className="font-semibold">
            サムネイル制作 · {VIDEO_REQUEST_STATUS_LABELS[request.thumbnailStatus]}
          </h3>
          {request.thumbnailMessageUrl ? (
            <a
              className="underline"
              href={request.thumbnailMessageUrl}
              target="_blank"
              rel="noreferrer"
            >
              納品されたサムネをDiscordで確認
            </a>
          ) : (
            request.discord.thumbnailThreadUrl && (
              <a
                className="underline"
                href={request.discord.thumbnailThreadUrl}
                target="_blank"
                rel="noreferrer"
              >
                サムネ用スレッドを開く
              </a>
            )
          )}
          {request.thumbnailStatus === 'review_requested' && (
            <>
              <Textarea
                label="サムネの修正内容"
                value={thumbnailRevision}
                onChange={(e) => setThumbnailRevision(e.target.value)}
                maxLength={1500}
              />
              <Button
                size="sm"
                disabled={busy || !thumbnailRevision.trim()}
                onClick={() => reviewThumb('revise')}
              >
                サムネの修正を依頼
              </Button>
            </>
          )}
          {(request.thumbnailStatus === 'in_progress' ||
            request.thumbnailStatus === 'review_requested') && (
            <Button
              size="sm"
              variant="success"
              disabled={busy}
              onClick={() => reviewThumb('approve')}
            >
              サムネを承認して完了
            </Button>
          )}
        </section>
      )}
      <div className="text-xs text-muted space-y-1">
        <p>
          初稿: {dateLabel(request.firstDraftDueAt)}　完パケ: {dateLabel(request.finalPackageDueAt)}
        </p>
        <p>
          Discord:{' '}
          {request.discord.status === 'created'
            ? 'スレッド作成済み'
            : request.discord.status === 'failed'
              ? '送信失敗'
              : 'Bot処理待ち'}
        </p>
        {request.discord.status === 'failed' && (
          <>
            <p>理由：{request.discord.error ?? '不明'}</p>
            {request.discord.expectedThreadCount !== null && (
              <p>
                作成済みスレッド：{createdThreadCount}/{request.discord.expectedThreadCount}
              </p>
            )}
            {canManageResources && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={retryDiscord}>
                Discordへ再送信
              </Button>
            )}
          </>
        )}
      </div>
      {request.deliveryUrls.length > 0 && (
        <div className="rounded-md border border-success/40 bg-success-tint p-3">
          <p className="mb-2 text-xs font-bold text-success">
            納品ファイル（{request.deliveryUrls.length}件）
          </p>
          <div className="space-y-1.5">
            {request.deliveries.map((delivery, index) => (
              <div key={`${delivery.url}-${index}`} className="rounded-sm bg-card px-2.5 py-2">
                <a
                  href={delivery.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-xs font-medium text-text transition-colors hover:text-success"
                >
                  <Icon name="open_in_new" size={15} className="text-success" />
                  <span className="shrink-0">納品ファイル{index + 1}</span>
                  <span className="min-w-0 truncate text-muted">{delivery.url}</span>
                </a>
                {delivery.note && (
                  <p className="mt-1.5 whitespace-pre-wrap border-t border-border pt-1.5 text-xs text-text-2">
                    共有事項：{delivery.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {request.ownerResourceUrls.length > 0 && (
        <div className="rounded-md border border-brand/40 bg-brand/10 p-3">
          <p className="mb-2 text-xs font-bold text-brand">
            オーナー共有資料（{request.ownerResourceUrls.length}件）
          </p>
          <div className="space-y-1.5">
            {request.ownerResourceUrls.map((url, index) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-sm bg-card px-2.5 py-2 text-xs font-medium text-text transition-colors hover:bg-surface"
              >
                <Icon name="open_in_new" size={15} className="text-brand" />
                <span className="shrink-0">共有資料{index + 1}</span>
                <span className="min-w-0 truncate text-muted">{url}</span>
              </a>
            ))}
          </div>
        </div>
      )}
      {request.discord.editorThreadUrls.map((url) => (
        <a
          key={url}
          className="text-xs text-purple-l hover:underline block truncate"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          編集スレッドを開く
        </a>
      ))}
      <div className="space-y-2 pt-2 border-t border-border">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          依頼内容を編集
        </Button>
        {request.status !== 'completed' && (
          <>
            {canManageResources && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => setShowOwnerResourceForm((shown) => !shown)}
              >
                オーナー用資料URLを追加
              </Button>
            )}
            {canManageResources && showOwnerResourceForm && (
              <div className="flex flex-col gap-2 rounded-sm bg-surface p-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Input
                    label="共有資料URL（プロジェクトファイル・素材など）"
                    value={ownerResourceUrl}
                    onChange={(event) => setOwnerResourceUrl(event.target.value)}
                    type="url"
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!ownerResourceUrl.trim() || busy}
                  onClick={addOwnerResourceUrl}
                >
                  登録する
                </Button>
              </div>
            )}
            <Textarea
              value={revision}
              onChange={(e) => setRevision(e.target.value)}
              rows={2}
              placeholder="修正内容を入力するとDiscordへ自動投稿します"
              maxLength={2000}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={!revision.trim() || busy}
                onClick={revise}
              >
                動画の修正を依頼
              </Button>
              <Button size="sm" variant="success" disabled={busy} onClick={approve}>
                動画を承認して完了
              </Button>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-xs text-live">{error}</p>}
    </Card>
  );
}
