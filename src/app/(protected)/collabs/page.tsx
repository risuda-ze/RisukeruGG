'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth';
import {
  subscribeCollabSessions,
  createCollabSession,
  updateCollabSession,
  reopenCollabSession,
} from '@/lib/repositories/collabs';
import { TopBar } from '@/components/layout/TopBar';
import { CollabDetailModal } from '@/components/collab/CollabDetailModal';
import { Spinner } from '@/components/ui/Spinner';
import { LIGHT_PLAN_LIMITS, COLLAB_STATUS_LABELS } from '@/types/entities';
import { Icon } from '@/components/ui/Icon';
import type { CollabSession, CollabParticipant } from '@/types/entities';

/* コラボアイコン候補 */
const COLLAB_ICONS = [
  'sports_esports',
  'live_tv',
  'mic',
  'handshake',
  'music_note',
  'movie',
  'star',
  'group',
  'campaign',
  'video_library',
  'celebration',
];

/* アバター背景色セット */
const AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg,#3a1a6a,#6a2a9a)', text: '#cc88ff' },
  { bg: 'linear-gradient(135deg,#1a3a1a,#2a6a2a)', text: '#66cc66' },
  { bg: 'linear-gradient(135deg,#3a1a1a,#6a2a2a)', text: '#cc8888' },
  { bg: 'linear-gradient(135deg,#1a3a3a,#2a6a6a)', text: '#88cccc' },
];
function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/* ステータスバッジのスタイル */
function StatusBadge({ status }: { status: CollabSession['status'] }) {
  const label = COLLAB_STATUS_LABELS[status];
  if (status === 'open') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
        style={{
          background: 'var(--live-xs)',
          color: 'var(--live)',
          borderColor: 'rgba(255,77,109,0.3)',
        }}
      >
        ⏳ {label}
      </span>
    );
  }
  if (status === 'confirmed') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
        style={{
          background: 'rgba(74,222,128,0.15)',
          color: 'var(--green)',
          borderColor: 'rgba(74,222,128,0.3)',
        }}
      >
        ✓ {label}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border"
      style={{
        background: 'var(--purple-xs)',
        color: 'var(--muted)',
        borderColor: 'var(--border)',
      }}
    >
      {label}
    </span>
  );
}

export default function CollabsPage() {
  const { currentUser, currentTeam, members } = useAuthStore();
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<CollabSession | null>(null);

  /* 再調整確認・実行中・エラー state */
  const [confirmReopenId, setConfirmReopenId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [reopenError, setReopenError] = useState<string | null>(null);

  /* 新規コラボ調整フォーム */
  const [formTitle, setFormTitle] = useState('');
  const [formIcon, setFormIcon] = useState('sports_esports');
  const [content, setContent] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [formParticipants, setFormParticipants] = useState<CollabParticipant[]>([]);
  const [externalName, setExternalName] = useState('');
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  /* フォームエリアの外クリックでメンバーピッカーを閉じる */
  const memberPickerRef = useRef<HTMLDivElement>(null);

  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const canEdit = myMember?.role === 'operator' || myMember?.role === 'member';
  /* 当月の作成数のみカウント（monthlyCollabs は月次制限） */
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const myCollabCount = sessions.filter(
    (s) => s.createdBy === currentUser?.uid && s.createdAt >= currentMonthStart
  ).length;
  const isLightPlanFull =
    myMember?.plan === 'light' && myCollabCount >= LIGHT_PLAN_LIMITS.monthlyCollabs;

  const openSessions = sessions.filter((s) => s.status === 'open');
  const confirmedSessions = sessions
    .filter((s) => s.status === 'confirmed')
    .sort((a, b) => (a.confirmedDate?.getTime() ?? 0) - (b.confirmedDate?.getTime() ?? 0));

  const receivedCount = openSessions.filter((s) => s.createdBy !== currentUser?.uid).length;
  const sentCount = openSessions.filter((s) => s.createdBy === currentUser?.uid).length;

  useEffect(() => {
    if (!teamId) return;
    return subscribeCollabSessions(teamId, (data) => {
      setSessions(data);
      setLoading(false);
    });
  }, [teamId]);

  /* 現在ログイン中のメンバーをフォーム参加者に初期セット */
  useEffect(() => {
    if (myMember && formParticipants.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormParticipants([{ id: myMember.userId, name: myMember.displayName, type: 'member' }]);
    }
  }, [myMember]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !formTitle.trim()) {
      setFormError('タイトルを入力してください');
      return;
    }
    /* 外部参加者の名前をpartnerNameとして使用、なければタイトルを代用 */
    const externalParticipants = formParticipants.filter((p) => p.type === 'external');
    const partnerName =
      externalParticipants.length > 0
        ? externalParticipants.map((p) => p.name).join(', ')
        : formTitle.trim();

    setSubmitting(true);
    setFormError(null);
    try {
      const result = await createCollabSession({
        teamId,
        title: formTitle.trim(),
        partnerName,
        proposedDates: proposedDate ? [new Date(proposedDate).toISOString()] : [],
        expiresInDays: 14,
      });
      /* Cloud Functionが受け取れないフィールドをまとめて保存 */
      await updateCollabSession(teamId, result.data.sessionId, {
        icon: formIcon,
        content: content.trim() || null,
        participants: formParticipants,
      });
      /* shareUrlが返されればそれを使用、なければ手動生成 */
      const url =
        result.data.shareUrl ||
        `${window.location.origin}/collab/${teamId}__${result.data.sessionId}`;
      setCreatedUrl(url);
      setFormTitle('');
      setFormIcon('sports_esports');
      setContent('');
      setProposedDate('');
      setFormParticipants(
        myMember ? [{ id: myMember.userId, name: myMember.displayName, type: 'member' }] : []
      );
    } catch {
      setFormError('作成に失敗しました。Firebaseエミュレータが起動しているか確認してください。');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUrl() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  function addExternalParticipant() {
    if (!externalName.trim()) return;
    setFormParticipants((prev) => [
      ...prev,
      { id: `ext_${Date.now()}`, name: externalName.trim(), type: 'external' },
    ]);
    setExternalName('');
  }

  function removeFormParticipant(id: string) {
    setFormParticipants((prev) => prev.filter((p) => p.id !== id));
  }

  function addMemberParticipant(memberId: string, name: string) {
    if (formParticipants.some((p) => p.id === memberId)) return;
    setFormParticipants((prev) => [...prev, { id: memberId, name, type: 'member' }]);
  }

  function handleDuplicate(source: CollabSession) {
    setFormTitle(source.title);
    setContent(source.content ?? '');
    setFormParticipants(source.participants ?? []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* 確定コラボを再調整状態に戻す */
  async function handleReopen(sessionId: string) {
    if (!teamId) return;
    setReopeningId(sessionId);
    setReopenError(null);
    try {
      await reopenCollabSession({ teamId, sessionId });
      setConfirmReopenId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '再調整に失敗しました';
      setReopenError(msg);
    } finally {
      setReopeningId(null);
    }
  }

  if (!teamId) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar title="コラボ調整" />
        <div className="flex-1 flex items-center justify-center text-muted text-sm">
          チームに参加してからコラボ機能を利用できます
        </div>
      </div>
    );
  }

  /* フォーム参加者に未追加のメンバー一覧 */
  const availableMembers = members.filter((m) => !formParticipants.some((p) => p.id === m.userId));

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <TopBar title="コラボ調整" />

      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-6 p-6 items-start min-h-full">
          {/* ── 中央カラム: コラボリスト ──────────────────── */}
          <div className="flex-1 flex flex-col gap-6">
            {/* 受信・送信セクション */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="text-[15px] font-bold text-muted">受信・送信したコラボ調整</div>
                {(receivedCount > 0 || sentCount > 0) && (
                  <div className="flex items-center gap-2 text-[12px] text-muted">
                    {receivedCount > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'var(--purple-xs)', color: 'var(--purple-l)' }}
                      >
                        受信 {receivedCount}件
                      </span>
                    )}
                    {sentCount > 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(239,159,39,0.12)', color: 'var(--amber-l)' }}
                      >
                        送信 {sentCount}件
                      </span>
                    )}
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Spinner size="lg" />
                </div>
              ) : openSessions.length === 0 ? (
                <div className="bg-card border border-border rounded-[18px] p-8 text-center text-muted text-sm">
                  コラボ調整はありません
                </div>
              ) : (
                openSessions.map((session) => {
                  const avatarColor = getAvatarColor(session.partnerName);
                  const initials = session.partnerName.slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={session.id}
                      className="bg-card border border-border rounded-[18px] p-5 flex items-center gap-5 transition-all hover:border-purple"
                      style={{ boxShadow: 'none' }}
                    >
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0"
                        style={{ background: avatarColor.bg, color: avatarColor.text }}
                      >
                        {session.icon ? (
                          <span className="material-icons text-[22px]">{session.icon}</span>
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <StatusBadge status={session.status} />
                          <span className="text-[12px] text-muted font-num">
                            {format(session.createdAt, 'M/d', { locale: ja })} 作成
                          </span>
                        </div>
                        <div className="text-[16px] font-bold text-text mb-1 truncate">
                          {session.title}
                        </div>
                        <div className="text-[13px] text-text-2 truncate">
                          {session.content ?? session.partnerName}
                        </div>
                      </div>
                      <button
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] text-[13px] font-semibold transition-colors"
                        style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                        onClick={() => setSelectedSession(session)}
                      >
                        詳細を見る
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* 予定確定したコラボセクション */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Icon name="event_available" size={20} className="text-green" />
                <div className="text-[15px] font-bold text-muted">予定確定したコラボ</div>
                {confirmedSessions.length > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-[12px] font-semibold"
                    style={{ background: 'rgba(74,222,128,0.12)', color: 'var(--green)' }}
                  >
                    {confirmedSessions.length}件
                  </span>
                )}
              </div>

              {!loading && confirmedSessions.length === 0 && (
                <div className="bg-card border border-border rounded-[18px] p-6 text-center text-muted text-sm">
                  確定したコラボはありません
                </div>
              )}

              {confirmedSessions.map((session) => {
                const avatarColor = getAvatarColor(session.partnerName);
                const isConfirmingReopen = confirmReopenId === session.id;
                const isReopening = reopeningId === session.id;

                return (
                  <div
                    key={session.id}
                    className="bg-card border rounded-[18px] p-5 flex flex-col gap-3 transition-all"
                    style={{ borderColor: 'rgba(74,222,128,0.3)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold shrink-0"
                        style={{ background: avatarColor.bg, color: avatarColor.text }}
                      >
                        {session.icon ? (
                          <span className="material-icons text-[18px]">{session.icon}</span>
                        ) : (
                          session.partnerName.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {session.confirmedDate && (
                          <div
                            className="text-[12px] font-bold font-num mb-0.5"
                            style={{ color: 'var(--green)' }}
                          >
                            {format(session.confirmedDate, 'M月d日（E） HH:mm〜', { locale: ja })}
                          </div>
                        )}
                        <div className="text-[15px] font-bold text-text truncate">
                          {session.title}
                        </div>
                        <div className="text-[12px] text-muted truncate">{session.partnerName}</div>
                      </div>
                      <button
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-colors"
                        style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                        onClick={() => setSelectedSession(session)}
                      >
                        詳細
                      </button>
                    </div>

                    {/* 再調整確認 UI */}
                    {isConfirmingReopen ? (
                      <div
                        className="rounded-[12px] p-3 text-[13px]"
                        style={{
                          background: 'rgba(239,159,39,0.10)',
                          border: '1px solid rgba(239,159,39,0.25)',
                        }}
                      >
                        <p className="text-muted mb-2">
                          再調整すると確定日時とカレンダー予定が削除されます。よろしいですか？
                        </p>
                        {/* エラー表示 */}
                        {reopenError && confirmReopenId === session.id && (
                          <p className="text-[12px] mb-2" style={{ color: 'var(--live)' }}>
                            {reopenError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-border text-muted hover:text-text transition-colors"
                            onClick={() => {
                              setConfirmReopenId(null);
                              setReopenError(null);
                            }}
                            disabled={isReopening}
                          >
                            キャンセル
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors disabled:opacity-50"
                            style={{ background: 'var(--amber-d)', color: 'var(--amber-l)' }}
                            onClick={() => handleReopen(session.id)}
                            disabled={isReopening}
                          >
                            {isReopening ? '処理中...' : '再調整する'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      canEdit && (
                        <button
                          className="self-start flex items-center gap-1 px-3 py-1.5 rounded-[10px] text-[12px] font-semibold border border-dashed transition-colors hover:border-amber"
                          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                          onClick={() => {
                            setConfirmReopenId(session.id);
                            setReopenError(null);
                          }}
                        >
                          <Icon name="refresh" size={14} />
                          再調整する
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 右カラム: フォーム ─────────────────────────── */}
          <div className="w-[380px] shrink-0 flex flex-col gap-6">
            {/* 新規コラボ調整フォーム */}
            <div
              className="bg-card border rounded-[18px] p-5"
              style={{ borderColor: 'var(--amber-d)' }}
            >
              <div
                className="text-[15px] font-bold mb-4 flex items-center gap-2"
                style={{ color: 'var(--amber-l)' }}
              >
                <Icon name="handshake" size={20} />
                新規コラボ調整
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* タイトル */}
                <div>
                  <label className="block text-[12px] font-semibold text-muted mb-2">
                    タイトル <span style={{ color: 'var(--live)' }}>*</span>
                  </label>
                  <input
                    id="collab-title-input"
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="例: Apex大会練習コラボ"
                    maxLength={100}
                    disabled={isLightPlanFull}
                    className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
                  />
                </div>

                {/* アイコン */}
                <div>
                  <label className="block text-[12px] font-semibold text-muted mb-2">
                    アイコン
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COLLAB_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormIcon(icon)}
                        disabled={isLightPlanFull}
                        className={`w-9 h-9 rounded-[8px] flex items-center justify-center border-2 transition-all ${
                          formIcon === icon
                            ? 'border-amber bg-amber/10 text-amber-l'
                            : 'border-transparent bg-bg text-muted hover:bg-surface hover:text-text'
                        }`}
                        title={icon}
                      >
                        <span className="material-icons text-[18px]">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 内容 */}
                <div>
                  <label className="block text-[12px] font-semibold text-muted mb-2">内容</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="コラボ内容詳細..."
                    rows={2}
                    maxLength={500}
                    disabled={isLightPlanFull}
                    className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple resize-y min-h-[60px]"
                  />
                </div>

                {/* 参加者 */}
                <div>
                  <label className="block text-[12px] font-semibold text-muted mb-2">参加者</label>
                  {/* 参加者チップ */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formParticipants.map((p) => (
                      <div
                        key={p.id}
                        className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1 text-[13px] font-semibold"
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={
                            p.type === 'member'
                              ? { background: 'var(--purple-d)', color: 'var(--purple-l)' }
                              : { background: 'var(--amber-d)', color: '#fff' }
                          }
                        >
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate max-w-[80px]">{p.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFormParticipant(p.id)}
                          className="text-muted hover:text-live transition-colors"
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    ))}
                    {/* メンバー追加ボタン */}
                    <div className="relative" ref={memberPickerRef}>
                      <button
                        type="button"
                        onClick={() => setShowMemberPicker((v) => !v)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-border text-muted text-[12px] font-semibold hover:border-purple hover:text-text transition-colors"
                      >
                        <Icon name="person_add" size={16} />
                        メンバー
                      </button>
                      {showMemberPicker && availableMembers.length > 0 && (
                        <div className="absolute top-8 left-0 z-20 bg-card border border-border-l rounded-[12px] shadow-xl p-2 min-w-[180px]">
                          {availableMembers.map((m) => (
                            <button
                              key={m.userId}
                              type="button"
                              onClick={() => {
                                addMemberParticipant(m.userId, m.displayName);
                                setShowMemberPicker(false);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-[8px] text-[13px] hover:bg-purple-xs text-text transition-colors text-left"
                            >
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
                              >
                                {m.displayName.slice(0, 2).toUpperCase()}
                              </div>
                              {m.displayName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* 外部参加者 */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && (e.preventDefault(), addExternalParticipant())
                      }
                      placeholder="外部参加者の名前"
                      className="flex-1 bg-bg border border-border text-text px-3 py-2 rounded-[10px] text-[13px] outline-none focus:border-purple"
                    />
                    <button
                      type="button"
                      onClick={addExternalParticipant}
                      className="px-3 py-2 rounded-[10px] text-[13px] font-semibold border border-border text-muted hover:text-text hover:border-border-l transition-colors bg-surface"
                    >
                      追加
                    </button>
                  </div>
                </div>

                {/* 希望日時 */}
                <div>
                  <label className="block text-[12px] font-semibold text-muted mb-2">
                    希望日時
                  </label>
                  <input
                    type="datetime-local"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    disabled={isLightPlanFull}
                    className="w-full bg-bg border border-border text-text px-3.5 py-2.5 rounded-[12px] text-[14px] outline-none transition-colors focus:border-purple"
                  />
                </div>

                {formError && <p className="text-[12px] text-live">{formError}</p>}

                {/* 発行済みURL表示 */}
                {createdUrl && (
                  <div className="bg-surface border border-border rounded-[8px] p-3">
                    <p className="text-[11px] text-muted mb-2">URLを相手に共有してください</p>
                    <p className="text-[11px] font-num text-text break-all mb-2">{createdUrl}</p>
                    <button
                      type="button"
                      onClick={copyUrl}
                      className="text-[11px] text-purple-l hover:text-purple transition-colors"
                    >
                      {urlCopied ? '✓ コピー済み' : 'URLをコピー'}
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || isLightPlanFull}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[14px] font-bold text-white transition-colors disabled:opacity-40"
                  style={{ background: 'var(--amber-d)' }}
                >
                  {submitting ? '作成中...' : 'URLを発行する'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* コラボ詳細モーダル */}
      {selectedSession && (
        <CollabDetailModal
          session={selectedSession}
          canEdit={canEdit}
          onClose={() => setSelectedSession(null)}
          onDeleted={() => setSelectedSession(null)}
          onReopen={() => setSelectedSession(null)}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}
