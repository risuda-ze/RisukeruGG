'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';

/**
 * トップバー右端のアカウントメニュー
 * - チーム変更: モーダルで TeamSwitcher を表示
 * - 個人設定: /settings/profile へ遷移
 * - ログアウト: signOut() を実行
 */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const signOut = useAuthStore((s) => s.signOut);

  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : '?';

  /* 外側クリックでドロップダウンを閉じる */
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleTeamChange() {
    setOpen(false);
    setTeamModalOpen(true);
  }

  function handleProfile() {
    setOpen(false);
    router.push('/settings/profile');
  }

  async function handleLogout() {
    setOpen(false);
    await signOut();
  }

  return (
    <>
      <div ref={ref} className="relative">
        {/* トリガーボタン */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-1.5 py-1 rounded-full border transition-colors"
          style={{
            borderColor: open ? 'var(--primary)' : 'var(--card-border)',
            background: 'var(--surface)',
            boxShadow: open ? 'var(--glow-primary)' : 'none',
          }}
          aria-label="アカウントメニュー"
          aria-expanded={open}
        >
          <Avatar
            initials={initials}
            src={currentUser?.photoURL}
            bgClass="bg-purple-d/30"
            textClass="text-purple-l"
            size="sm"
          />
          <Icon
            name="expand_more"
            size={14}
            style={{
              color: open ? 'var(--primary-300)' : 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : '',
              transition: 'transform 150ms',
            } as React.CSSProperties}
          />
        </button>

        {/* ドロップダウンメニュー */}
        {open && (
          <div
            className="absolute right-0 top-[calc(100%+8px)] z-[130] w-[220px] rounded-[12px] p-2 animate-pop-modal"
            style={{
              background: 'var(--card-raised)',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* ユーザー名ヘッダー */}
            <div
              className="flex items-center gap-2.5 px-2 py-2 mb-1"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <Avatar
                initials={initials}
                src={currentUser?.photoURL}
                bgClass="bg-purple-d/30"
                textClass="text-purple-l"
                size="md"
              />
              <p
                className="text-[13px] font-bold truncate"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-head)' }}
              >
                {currentUser?.displayName ?? 'ユーザー'}
              </p>
            </div>

            {/* チーム変更 */}
            <button
              onClick={handleTeamChange}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-[13px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--card)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <Icon name="groups" size={16} />
              <span>チーム変更</span>
            </button>

            {/* 個人設定 */}
            <button
              onClick={handleProfile}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-[13px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--card)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              }}
            >
              <Icon name="manage_accounts" size={16} />
              <span>個人設定</span>
            </button>

            {/* 区切り線 */}
            <div className="my-1.5 mx-1" style={{ borderTop: '1px solid var(--border)' }} />

            {/* ログアウト */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-[13px] transition-colors"
              style={{ color: 'var(--danger)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--danger-dim)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = '';
              }}
            >
              <Icon name="logout" size={16} />
              <span>ログアウト</span>
            </button>
          </div>
        )}
      </div>

      {/* チーム変更モーダル（TeamSwitcher を再利用） */}
      <Modal open={teamModalOpen} onClose={() => setTeamModalOpen(false)} title="チームを変更">
        <TeamSwitcher />
      </Modal>
    </>
  );
}
