'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/* ── ナビアイテム定義（5つ固定） ───────────────────────────── */
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.8}
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
    />
  </svg>
);
const CalendarIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.8}
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);
const TasksIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.8}
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125Z"
    />
  </svg>
);
const TeamIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={1.8}
    className="h-5 w-5"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
    />
  </svg>
);

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-surface border-t border-border"
      aria-label="メインナビゲーション"
    >
      <div className="flex w-full items-center justify-around px-2">
        {/* ホーム */}
        <NavLink href="/dashboard" label="ホーム" active={pathname.startsWith('/dashboard')}>
          <HomeIcon active={pathname.startsWith('/dashboard')} />
        </NavLink>

        {/* スケジュール */}
        <NavLink href="/schedule" label="スケジュール" active={pathname.startsWith('/schedule')}>
          <CalendarIcon active={pathname.startsWith('/schedule')} />
        </NavLink>

        {/* 追加ボタン（中央CTA） */}
        <Link
          href="/schedule"
          className="flex flex-col items-center justify-center gap-0.5"
          aria-label="スケジュールを追加"
        >
          <span className="flex items-center justify-center w-11 h-11 bg-amber rounded-[10px] text-white shadow-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </span>
          <span className="text-[10px] text-muted">追加</span>
        </Link>

        {/* タスク */}
        <NavLink href="/tasks" label="タスク" active={pathname.startsWith('/tasks')}>
          <TasksIcon active={pathname.startsWith('/tasks')} />
        </NavLink>

        {/* チーム */}
        <NavLink href="/team" label="チーム" active={pathname.startsWith('/team')}>
          <TeamIcon active={pathname.startsWith('/team')} />
        </NavLink>
      </div>
    </nav>
  );
}

/* 通常ナビアイテム */
function NavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-3 py-2 text-[10px] transition-colors ${
        active ? 'text-purple-l' : 'text-muted hover:text-text'
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
