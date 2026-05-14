'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';

/* ── ナビゲーション定義 ─────────────────────────────────────── */
interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

/* SVGアイコン定義（strokeWidth 1.8 統一） */
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
);
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);
const TasksIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);
const CollabIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);
const TeamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);
const BellIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);
const YoutubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
  </svg>
);
const TwitchIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
  </svg>
);
const SignOutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4 shrink-0">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
  </svg>
);

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'メイン',
    items: [
      { href: '/dashboard', label: 'ダッシュボード', icon: <HomeIcon /> },
      { href: '/schedule',  label: 'スケジュール',   icon: <CalendarIcon /> },
      { href: '/tasks',     label: 'タスク管理',     icon: <TasksIcon /> },
      { href: '/collabs',   label: 'コラボ調整',     icon: <CollabIcon /> },
    ],
  },
  {
    label: 'チーム',
    items: [
      { href: '/team',          label: 'メンバー',       icon: <TeamIcon /> },
      { href: '/notifications', label: '通知',           icon: <BellIcon /> },
      { href: '/settings',      label: 'チャンネル設定', icon: <SettingsIcon /> },
    ],
  },
];

/* ── Sidebarコンポーネント ──────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, currentTeam, signOut } = useAuthStore();

  /* ユーザーのイニシャルを生成 */
  const initials = currentUser?.displayName
    ? currentUser.displayName.slice(0, 2).toUpperCase()
    : '?';

  return (
    <aside className="w-[220px] shrink-0 bg-surface border-r border-border hidden md:flex flex-col h-screen sticky top-0">
      {/* ── ロゴエリア ─────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          {/* SVGマスコット（コントローラー形状） */}
          <svg viewBox="0 0 32 32" fill="none" className="h-7 w-7 shrink-0">
            <rect width="32" height="32" rx="8" fill="var(--purple-d)" />
            <path d="M8 16c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8Z" fill="var(--purple)" opacity=".3"/>
            <rect x="13" y="12" width="2" height="6" rx="1" fill="var(--purple-l)"/>
            <rect x="11" y="14" width="6" height="2" rx="1" fill="var(--purple-l)"/>
            <circle cx="22" cy="14" r="1.2" fill="var(--amber)"/>
            <circle cx="19" cy="17" r="1.2" fill="var(--amber)"/>
          </svg>
          <span className="text-sm font-bold text-text tracking-tight">リスケるGG</span>
        </div>
        {currentTeam && (
          <p className="text-[10px] text-muted mt-1.5 truncate">{currentTeam.name}</p>
        )}
      </div>

      {/* ── ナビゲーション ───────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-bold text-muted tracking-widest uppercase px-2 mb-1.5">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2 py-2 rounded-[8px] text-sm transition-colors ${
                        active
                          ? 'border-l-2 border-purple bg-purple/12 text-purple-l -ml-[2px] pl-[10px]'
                          : 'text-muted hover:text-text hover:bg-purple/8'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* ── 連携セクション ─────────────────────────────── */}
        <div>
          <p className="text-[10px] font-bold text-muted tracking-widest uppercase px-2 mb-1.5">
            連携
          </p>
          <ul className="space-y-0.5">
            <li>
              <span className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted/60 cursor-default select-none">
                <YoutubeIcon />YouTube
              </span>
            </li>
            <li>
              <span className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted/60 cursor-default select-none">
                <TwitchIcon />Twitch
              </span>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── フッター（ユーザー情報） ─────────────────────── */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            initials={initials}
            bgClass="bg-purple-d/30"
            textClass="text-purple-l"
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-[11px] text-text truncate leading-tight">
              {currentUser?.displayName ?? 'ユーザー'}
            </p>
            <Badge variant="purple" className="mt-0.5">PARTY</Badge>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="p-1.5 rounded-[6px] text-muted hover:text-text hover:bg-surface transition-colors"
          aria-label="サインアウト"
        >
          <SignOutIcon />
        </button>
      </div>
    </aside>
  );
}
