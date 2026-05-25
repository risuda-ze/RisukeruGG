'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { switchActiveTeam } from '@/lib/repositories/teams';
import { getTeam } from '@/lib/repositories/teams';
import type { Team } from '@/types/entities';

interface TeamSwitcherProps {
  collapsed?: boolean;
}

export function TeamSwitcher({ collapsed = false }: TeamSwitcherProps) {
  const { currentTeamId, teamIds, currentTeam } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  /* 所属チームの情報を取得 */
  useEffect(() => {
    if (!open || teamIds.length === 0) return;
    Promise.all(teamIds.map((id) => getTeam(id))).then((results) => {
      setTeams(results.filter((t): t is Team => t !== null));
    });
  }, [open, teamIds]);

  /* 外側クリックで閉じる */
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  async function handleSwitch(teamId: string) {
    if (teamId === currentTeamId || switching) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      await switchActiveTeam({ teamId });
      setOpen(false);
      // ページ全体をリロードしてサブスクリプションを確実に更新する
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSwitchError(msg || 'チームの切り替えに失敗しました');
      setSwitching(false);
    }
  }

  if (teamIds.length <= 1 && !collapsed) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-muted hover:text-text hover:bg-purple/8 transition-colors ${
          collapsed ? 'justify-center' : ''
        }`}
        title={collapsed ? `チーム切替（${teamIds.length}チーム）` : undefined}
        disabled={switching}
      >
        <span className="material-icons text-[20px] shrink-0">swap_horiz</span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left text-[13px] truncate min-w-0">
              {currentTeam?.name ?? 'チームを選択'}
            </span>
            <span className="material-icons text-[14px] shrink-0">
              {open ? 'expand_less' : 'expand_more'}
            </span>
          </>
        )}
      </button>

      {switchError && (
        <div className="mt-1 px-2 py-1 text-[10px] text-live bg-live/10 border border-live/30 rounded-[6px]">
          {switchError}
        </div>
      )}

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-[12px] shadow-lg z-50 overflow-hidden min-w-[200px]">
          <div className="px-3 py-2 text-[10px] font-bold text-muted tracking-widest uppercase border-b border-border">
            チームを切替
          </div>
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleSwitch(team.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-left transition-colors ${
                team.id === currentTeamId
                  ? 'bg-purple/10 text-purple-l'
                  : 'text-text hover:bg-surface'
              }`}
            >
              <span
                className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                style={{ background: 'var(--purple-d)', color: 'var(--purple-l)' }}
              >
                {team.name.slice(0, 1)}
              </span>
              <span className="flex-1 truncate">{team.name}</span>
              {team.id === currentTeamId && (
                <span className="material-icons text-[14px] text-purple-l">check</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
