'use client';

import { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth';
import { deleteAccount } from '@/lib/repositories/teams';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import type { NotificationPreferences } from '@/types/entities';

type Tab = 'profile' | 'notifications' | 'plan' | 'account';

const TAB_LABELS: Record<Tab, string> = {
  profile: 'プロフィール',
  notifications: '通知設定',
  plan: 'プラン',
  account: 'アカウント',
};

type NotifCategory = keyof NotificationPreferences;
type NotifChannel = 'inApp' | 'push';

const NOTIF_CATEGORY_LABELS: Record<NotifCategory, string> = {
  collab: 'コラボ',
  tasks: 'タスク',
  reminders: 'リマインダー',
  system: 'システム',
};

const DEFAULT_PREFS: NotificationPreferences = {
  collab: { inApp: true, push: true },
  tasks: { inApp: true, push: true },
  reminders: { inApp: true, push: true },
  system: { inApp: true, push: false },
};

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const { currentUser, currentTeam, members, signOut } = useAuthStore();
  const router = useRouter();

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOwnerWithMembers = myMember?.role === 'owner' && members.length > 1;
  const isParty = myMember?.plan === 'party';

  /* ── プロフィール ──────────────────────────────────────────── */
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(currentUser?.displayName ?? '');
    setAvatarPreview(currentUser?.photoURL ?? null);
  }, [currentUser?.displayName, currentUser?.photoURL]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !currentUser) return;
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      await updateProfile(auth.currentUser!, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', currentUser.uid), { displayName: displayName.trim() });
      if (currentTeam) {
        await updateDoc(
          doc(db, 'teams', currentTeam.id, 'members', currentUser.uid),
          { displayName: displayName.trim() }
        );
      }
      setNameSaved(true);
    } catch {
      setNameError('表示名の更新に失敗しました');
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('ファイルサイズは5MB以下にしてください');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser!, { photoURL: downloadUrl });
      await updateDoc(doc(db, 'users', currentUser.uid), { avatarUrl: downloadUrl });
      if (currentTeam) {
        await updateDoc(
          doc(db, 'teams', currentTeam.id, 'members', currentUser.uid),
          { avatarUrl: downloadUrl }
        );
      }
      setAvatarPreview(downloadUrl);
    } catch {
      setAvatarError('アイコンのアップロードに失敗しました');
      setAvatarPreview(currentUser.photoURL ?? null);
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  /* ── 通知設定 ─────────────────────────────────────────────── */
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);

  async function togglePref(category: NotifCategory, channel: NotifChannel) {
    if (!currentUser) return;
    const newPrefs = {
      ...prefs,
      [category]: { ...prefs[category], [channel]: !prefs[category][channel] },
    };
    setPrefs(newPrefs);
    setSavingPrefs(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        notificationPreferences: newPrefs,
      });
    } finally {
      setSavingPrefs(false);
    }
  }

  /* ── プラン ───────────────────────────────────────────────── */
  const [savingPlan, setSavingPlan] = useState(false);

  async function handlePlanChange(newPlan: 'light' | 'party') {
    if (!currentUser) return;
    setSavingPlan(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { plan: newPlan });
      if (currentTeam) {
        await updateDoc(
          doc(db, 'teams', currentTeam.id, 'members', currentUser.uid),
          { plan: newPlan }
        );
      }
    } finally {
      setSavingPlan(false);
    }
  }

  /* ── アカウント削除 ───────────────────────────────────────── */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await signOut();
      router.replace('/login');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : '';
      if (code === 'functions/failed-precondition') {
        setDeleteError(message || '先に所有権を移譲してください');
      } else {
        setDeleteError(`削除に失敗しました（${code}）`);
      }
    } finally {
      setDeleting(false);
    }
  }

  const initials = (currentUser?.displayName ?? 'U').slice(0, 2).toUpperCase();
  const notifCategories: NotifCategory[] = ['collab', 'tasks', 'reminders', 'system'];

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="個人設定" />

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl">
        {/* ── タブナビゲーション ─────────────────────────────── */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-purple text-purple-l'
                  : 'border-transparent text-muted hover:text-text'
              }`}
              aria-current={activeTab === tab ? 'page' : undefined}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* ── プロフィール ─────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* アイコン */}
            <Card>
              <h3 className="text-sm font-semibold text-text mb-4">アイコン</h3>
              <div className="flex items-center gap-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ background: 'var(--purple-d)' }}
                >
                  {avatarPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarPreview}
                      alt="アバター"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[22px] font-bold" style={{ color: 'var(--purple-l)' }}>
                      {initials}
                    </span>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    画像を選択
                  </Button>
                  <p className="text-[11px] text-muted mt-1.5">PNG・JPEG・GIF・WebP（最大5MB）</p>
                  {avatarError && (
                    <p className="text-[11px] text-live mt-1">{avatarError}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* 表示名 */}
            <Card>
              <h3 className="text-sm font-semibold text-text mb-4">表示名</h3>
              <form onSubmit={handleSaveName} className="space-y-3">
                <Input
                  label=""
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setNameSaved(false);
                  }}
                  placeholder="表示名を入力"
                  maxLength={50}
                  error={nameError ?? undefined}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="submit"
                    size="sm"
                    loading={savingName}
                    disabled={!displayName.trim() || displayName === currentUser?.displayName}
                  >
                    保存する
                  </Button>
                  {nameSaved && (
                    <span className="text-[12px] text-green flex items-center gap-1">
                      <span className="material-icons text-[14px]">check_circle</span>
                      保存しました
                    </span>
                  )}
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* ── 通知設定 ─────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-text">通知設定</h3>

            {!isParty && (
              <Card className="border-amber/20">
                <p className="text-sm font-medium text-amber-l mb-1">
                  LIGHTプランではシステム通知のみ利用可能です
                </p>
                <p className="text-[12px] text-muted">
                  PARTYプランにアップグレードすると全4カテゴリの通知を設定できます。
                </p>
              </Card>
            )}

            <Card noPadding>
              <div className="grid grid-cols-3 border-b border-border px-[18px] py-2 bg-surface/50">
                <span className="text-[11px] font-medium text-muted">カテゴリ</span>
                <span className="text-[11px] font-medium text-muted text-center">アプリ内</span>
                <span className="text-[11px] font-medium text-muted text-center">プッシュ</span>
              </div>
              {notifCategories.map((category) => {
                const isLocked = !isParty && category !== 'system';
                return (
                  <div
                    key={category}
                    className={`grid grid-cols-3 px-[18px] py-3 border-b border-border last:border-0 ${
                      isLocked ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-sm text-text">{NOTIF_CATEGORY_LABELS[category]}</span>
                    </div>
                    {(['inApp', 'push'] as NotifChannel[]).map((channel) => (
                      <div key={channel} className="flex justify-center items-center">
                        <button
                          type="button"
                          onClick={() => !isLocked && togglePref(category, channel)}
                          disabled={isLocked || savingPrefs}
                          role="switch"
                          aria-checked={prefs[category][channel]}
                          className={`relative w-10 h-6 rounded-full transition-colors ${
                            !isLocked && prefs[category][channel] ? 'bg-purple' : 'bg-border'
                          } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-text rounded-full shadow transition-transform ${
                              !isLocked && prefs[category][channel]
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ── プラン ───────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-text">プランの管理</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['light', 'party'] as const).map((plan) => {
                const isCurrent = myMember?.plan === plan;
                return (
                  <Card key={plan} className={isCurrent ? 'border-purple/60' : ''}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[15px] font-bold text-text">
                          {plan === 'light' ? 'LIGHT' : 'PARTY'}
                        </p>
                        <p className="text-[11px] text-muted mt-0.5">
                          {plan === 'light' ? '個人利用向け基本プラン' : 'チーム向けフルプラン'}
                        </p>
                      </div>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'var(--purple-sm)',
                            color: 'var(--purple-l)',
                            border: '1px solid var(--purple)',
                          }}
                        >
                          現在のプラン
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1 text-[12px] text-muted mb-4">
                      {plan === 'light' ? (
                        <>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            スケジュール管理
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            タスク管理（基本）
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-muted/40">close</span>
                            コラボ調整
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-muted/40">close</span>
                            チーム機能
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            スケジュール管理
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            タスク管理（全機能）
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            コラボ調整
                          </li>
                          <li className="flex items-center gap-1.5">
                            <span className="material-icons text-[14px] text-green">check</span>
                            チーム機能（複数メンバー）
                          </li>
                        </>
                      )}
                    </ul>

                    {!isCurrent && (
                      <Button
                        size="sm"
                        loading={savingPlan}
                        onClick={() => handlePlanChange(plan)}
                      >
                        {plan === 'party' ? 'アップグレードする' : 'ダウングレードする'}
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── アカウント ───────────────────────────────────── */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-live mb-1">危険ゾーン</h3>
              <p className="text-[12px] text-muted mb-4">
                一度削除したアカウントは復元できません。
              </p>
              <Card className="border-live/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text mb-0.5">アカウントを削除する</p>
                    <p className="text-[12px] text-muted">
                      {isOwnerWithMembers
                        ? '先にチームの所有権を別のメンバーに移譲してください。'
                        : 'アカウント・チームデータ・スケジュールがすべて削除されます。'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setDeleteError(null);
                      setShowDeleteDialog(true);
                    }}
                    disabled={isOwnerWithMembers}
                    className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-live/40 text-live hover:bg-live/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    削除する
                  </button>
                </div>
                {isOwnerWithMembers && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-l">
                    <span className="material-icons text-[14px]">info</span>
                    <a href="/team" className="underline hover:no-underline">
                      チームページ
                    </a>
                    から所有権を移譲してください。
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* ── アカウント削除確認ダイアログ ─────────────────── */}
      <Modal
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="アカウントを削除する"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDeleteAccount}>
              削除する
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-text">以下のデータが完全に削除されます：</p>
          <ul className="space-y-1 text-[13px] text-muted list-none">
            <li className="flex items-center gap-2">
              <span className="material-icons text-[14px] text-live">remove_circle_outline</span>
              アカウント情報（名前・メールアドレス）
            </li>
            <li className="flex items-center gap-2">
              <span className="material-icons text-[14px] text-live">remove_circle_outline</span>
              チームとすべてのスケジュール
            </li>
            <li className="flex items-center gap-2">
              <span className="material-icons text-[14px] text-live">remove_circle_outline</span>
              タスク・通知などのアプリデータ
            </li>
          </ul>
          <p className="text-[12px] text-live font-semibold pt-1">この操作は取り消せません。</p>
          {deleteError && (
            <p className="text-[12px] text-live bg-live/10 border border-live/30 rounded-[8px] px-3 py-2">
              {deleteError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
