'use client';

import { useState, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import packageJson from '../../../../../package.json';
import { auth, db, storage } from '@/lib/firebase/client';
import { useAuthStore } from '@/stores/auth';
import { deleteAccount } from '@/lib/repositories/teams';
import { DiscordUsernameDialog } from '@/components/team/DiscordUsernameDialog';
import { TopBar } from '@/components/layout/TopBar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Icon } from '@/components/ui/Icon';
import { Dropdown } from '@/components/ui/Dropdown';
import { isPartyPlan, isFreePartyMode } from '@/lib/plan';
import { createStripeCheckoutSession, createStripePortalSession } from '@/lib/repositories/billing';
import { trackEvent } from '@/lib/analytics';

// アプリ情報タブを含む4タブ構成
type Tab = 'profile' | 'plan' | 'account' | 'app-info';

const TAB_LABELS: Record<Tab, string> = {
  profile: 'プロフィール',
  plan: 'プラン',
  account: 'アカウント',
  'app-info': 'アプリ情報',
};

export default function ProfileSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isOperatorWithMembers = myMember?.role === 'operator' && members.length > 1;
  // 通知制限（PL-002）の判定。試用モード中は PARTY 相当として全通知カテゴリを解放する
  const isParty = isPartyPlan(myMember?.plan);

  /* ── プロフィール ──────────────────────────────────────────── */
  const [discordDialogOpen, setDiscordDialogOpen] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [avatarPreviewDraft, setAvatarPreviewDraft] = useState<string | null | undefined>(
    undefined
  );
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = displayNameDraft ?? currentUser?.displayName ?? '';
  const avatarPreview =
    avatarPreviewDraft === undefined ? (currentUser?.photoURL ?? null) : avatarPreviewDraft;

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
        await updateDoc(doc(db, 'teams', currentTeam.id, 'members', currentUser.uid), {
          displayName: displayName.trim(),
        });
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
    setAvatarPreviewDraft(localUrl);
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateProfile(auth.currentUser!, { photoURL: downloadUrl });
      await updateDoc(doc(db, 'users', currentUser.uid), { avatarUrl: downloadUrl });
      if (currentTeam) {
        await updateDoc(doc(db, 'teams', currentTeam.id, 'members', currentUser.uid), {
          avatarUrl: downloadUrl,
        });
      }
      setAvatarPreviewDraft(downloadUrl);
    } catch {
      setAvatarError('アイコンのアップロードに失敗しました');
      setAvatarPreviewDraft(currentUser.photoURL ?? null);
    } finally {
      setUploadingAvatar(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  /* ── プラン（Stripe 課金導線・T4） ─────────────────────────── */
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  // 試用モード中（PL-011）は課金導線を出さない。
  const showBilling = !isFreePartyMode();

  async function handleUpgrade() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      trackEvent('upgrade_cta_click');
      const { data } = await createStripeCheckoutSession({});
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError('決済ページの生成に失敗しました');
      }
    } catch {
      setBillingError('決済ページの生成に失敗しました');
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const { data } = await createStripePortalSession({});
      if (data.url) {
        window.location.href = data.url;
      } else {
        setBillingError('支払い設定ページの生成に失敗しました');
      }
    } catch {
      setBillingError('支払い設定ページの生成に失敗しました');
    } finally {
      setBillingLoading(false);
    }
  }

  /* ── アカウント削除 ───────────────────────────────────────── */
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [newOperatorId, setNewOperatorId] = useState('');

  function openDeleteDialog() {
    setDeleteError(null);
    // オペレーター指名が必要な場合は先頭候補を初期選択
    const candidates = members.filter((m) => m.userId !== currentUser?.uid);
    setNewOperatorId(candidates[0]?.userId ?? '');
    setShowDeleteDialog(true);
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const operatorAssignments =
        isOperatorWithMembers && newOperatorId && currentTeam
          ? [{ teamId: currentTeam.id, newOperatorId }]
          : [];
      await deleteAccount({ operatorAssignments });
      await signOut();
      router.replace('/login');
    } catch (err: unknown) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as { code: unknown }).code)
          : 'unknown';
      setDeleteError(`削除に失敗しました（${code}）`);
    } finally {
      setDeleting(false);
    }
  }

  const initials = (currentUser?.displayName ?? 'U').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="個人設定" subtitle="プロフィールや個人設定を変更できます" />

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl">
        {/* ── タブナビゲーション ─────────────────────────────── */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary text-brand-2'
                  : 'border-transparent text-text-muted hover:text-text'
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
                  style={{ background: 'color-mix(in oklab, var(--primary) 35%, transparent)' }}
                >
                  {avatarPreview ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarPreview}
                      alt="アバター"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[22px] font-bold" style={{ color: 'var(--brand-2)' }}>
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
                  <p className="text-[11px] text-text-muted mt-1.5">PNG・JPEG・GIF・WebP（最大5MB）</p>
                  {avatarError && <p className="text-[11px] text-live mt-1">{avatarError}</p>}
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
                    setDisplayNameDraft(e.target.value);
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
                    disabled={
                      !displayName.trim() || displayName === (currentUser?.displayName ?? '')
                    }
                  >
                    保存する
                  </Button>
                  {nameSaved && (
                    <span className="text-[12px] text-success flex items-center gap-1">
                      <Icon name="check" size={14} />
                      保存しました
                    </span>
                  )}
                </div>
              </form>
            </Card>

            {/* Discord ユーザー名（TE-012）。アクティブチームのメンバー情報に保存する */}
            {currentTeam && myMember && (
              <Card>
                <h3 className="text-sm font-semibold text-text mb-1">Discord ユーザー名</h3>
                <p className="text-[12px] text-text-muted mb-4 leading-relaxed">
                  登録すると、Discord 連携の通知であなた宛てにメンションされます。ログイン連携ではなく、ユーザー名だけを保持します。チームごとの設定です（現在: {currentTeam.name}）。
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text flex items-center gap-1.5">
                    <Icon name="discord" size={16} className="text-text-muted" />
                    {myMember.discordUsername ? `@${myMember.discordUsername}` : '未設定'}
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => setDiscordDialogOpen(true)}>
                    {myMember.discordUsername ? '変更する' : '登録する'}
                  </Button>
                </div>
                {discordDialogOpen && (
                  <DiscordUsernameDialog
                    teamId={currentTeam.id}
                    member={myMember}
                    onClose={() => setDiscordDialogOpen(false)}
                  />
                )}
              </Card>
            )}
          </div>
        )}

        {/* ── プラン ───────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-5">
            <h3 className="text-sm font-semibold text-text">プランの管理</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(['light', 'party'] as const).map((plan) => {
                // 現在プランの表示は実効プラン（試用モード中は PARTY）に合わせる
                const isCurrent = (isParty ? 'party' : 'light') === plan;
                return (
                  <Card key={plan} className={isCurrent ? 'border-primary/60' : ''}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-[15px] font-bold text-text">
                          {plan === 'light' ? 'LIGHT' : 'PARTY'}
                        </p>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {plan === 'light' ? '個人利用向け基本プラン' : 'チーム向けフルプラン'}
                        </p>
                      </div>
                      {isCurrent && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: 'color-mix(in oklab, var(--primary) 15%, transparent)',
                            color: 'var(--brand-2)',
                            border: '1px solid var(--primary)',
                          }}
                        >
                          現在のプラン
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1 text-[12px] text-text-muted mb-4">
                      {plan === 'light' ? (
                        <>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            スケジュール管理
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            タスク管理（基本）
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="close" size={14} className="text-text-muted/40" />
                            コラボ調整
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="close" size={14} className="text-text-muted/40" />
                            チーム機能
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            スケジュール管理
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            タスク管理（全機能）
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            コラボ調整
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Icon name="check" size={14} className="text-success" />
                            チーム機能（複数メンバー）
                          </li>
                        </>
                      )}
                    </ul>

                    {plan === 'party' && !isCurrent && showBilling && (
                      <Button size="sm" loading={billingLoading} onClick={handleUpgrade}>
                        アップグレードする
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>

            {/* ── 課金アクション ─────────────────────────────── */}
            {showBilling && isParty && (
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text mb-0.5">支払い設定</p>
                    <p className="text-[12px] text-text-muted">
                      解約・支払い方法の変更・請求履歴の確認は Stripe の管理ページで行えます。
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={billingLoading}
                    onClick={handleManageBilling}
                  >
                    支払い設定を開く
                  </Button>
                </div>
              </Card>
            )}

            {!showBilling && (
              <Card className="border-warning/20">
                <p className="text-sm font-medium text-orange-text mb-1">
                  現在は公開試用期間につき全機能を無料でご利用いただけます
                </p>
                <p className="text-[12px] text-text-muted">
                  試用期間の終了後にPARTYプランの課金導線を有効化します。
                </p>
              </Card>
            )}

            {billingError && <p className="text-[12px] text-live">{billingError}</p>}
          </div>
        )}

        {/* ── アカウント ───────────────────────────────────── */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-live mb-1">危険ゾーン</h3>
              <p className="text-[12px] text-text-muted mb-4">
                一度削除したアカウントは復元できません。
              </p>
              <Card className="border-live/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text mb-0.5">アカウントを削除する</p>
                    <p className="text-[12px] text-text-muted">
                      {isOperatorWithMembers
                        ? '削除前に新しいオペレーターを選択してください。'
                        : 'アカウント・チームデータ・スケジュールがすべて削除されます。'}
                    </p>
                  </div>
                  <button
                    onClick={openDeleteDialog}
                    className="shrink-0 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border border-live/40 text-live hover:bg-live/10 transition-colors"
                  >
                    削除する
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── アプリ情報 ──────────────────────────────────────── */}
        {activeTab === 'app-info' && (
          <div className="space-y-6">
            <Card>
              <div className="space-y-6">
                {/* アプリ基本情報 */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted mb-3">アプリ情報</h3>
                  <div className="space-y-0 text-sm">
                    <div className="flex justify-between items-center border-b border-border py-3">
                      <span className="text-text-muted">アプリ名</span>
                      <span className="text-text font-medium">リスケるGG</span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-text-muted">バージョン</span>
                      {/* クリックでリリースノート（公開ページ）を別タブで開く */}
                      <Link
                        href="/release-notes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-text hover:text-brand-2 transition-colors"
                      >
                        v{packageJson.version}
                        <Icon name="open_in_new" size={20} className="text-text-muted" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 法的情報 */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted mb-3">法的情報</h3>
                  <div className="space-y-0">
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm text-text hover:text-brand-2 transition-colors py-3 border-b border-border"
                    >
                      <span>利用規約</span>
                      <Icon name="open_in_new" size={20} className="text-text-muted" />
                    </Link>
                    <Link
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm text-text hover:text-brand-2 transition-colors py-3 border-b border-border"
                    >
                      <span>プライバシーポリシー</span>
                      <Icon name="open_in_new" size={20} className="text-text-muted" />
                    </Link>
                    <Link
                      href="/tokushoho"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-sm text-text hover:text-brand-2 transition-colors py-3 border-b border-border"
                    >
                      <span>特定商取引法に基づく表記</span>
                      <Icon name="open_in_new" size={20} className="text-text-muted" />
                    </Link>
                  </div>
                </div>

                {/* サポート */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted mb-3">サポート</h3>
                  <Link
                    href="/settings/contact"
                    className="flex items-center justify-between text-sm text-text hover:text-brand-2 transition-colors py-3"
                  >
                    <span className="flex items-center gap-2">
                      <Icon name="mail_outline" size={16} className="text-text-muted" />
                      お問い合わせ
                    </span>
                    <Icon name="chevron_right" size={16} className="text-text-muted" />
                  </Link>
                </div>
              </div>
            </Card>
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
            <Button
              variant="danger"
              loading={deleting}
              disabled={isOperatorWithMembers && !newOperatorId}
              onClick={handleDeleteAccount}
            >
              削除する
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          {/* オペレーターが複数メンバーチームを持つ場合は指名UIを表示 */}
          {isOperatorWithMembers && (
            <div className="rounded-[10px] border border-warning/30 bg-warning/10 p-3 space-y-2">
              <p className="text-[12px] font-semibold text-orange-text">
                新しいオペレーターを選択してください
              </p>
              <Dropdown
                value={newOperatorId}
                options={members
                  .filter((m) => m.userId !== currentUser?.uid)
                  .map((m) => ({ value: m.userId, label: m.displayName }))}
                onChange={setNewOperatorId}
                scroll
              />
            </div>
          )}
          <p className="text-text">以下のデータが完全に削除されます：</p>
          <ul className="space-y-1 text-[13px] text-text-muted list-none">
            <li className="flex items-center gap-2">
              <Icon name="close" size={14} className="text-live" />
              アカウント情報（名前・メールアドレス）
            </li>
            <li className="flex items-center gap-2">
              <Icon name="close" size={14} className="text-live" />
              チームとすべてのスケジュール
            </li>
            <li className="flex items-center gap-2">
              <Icon name="close" size={14} className="text-live" />
              タスクなどのアプリデータ
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
