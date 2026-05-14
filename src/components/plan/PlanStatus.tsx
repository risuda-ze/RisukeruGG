'use client';

import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';

interface PlanStatusProps {
  monthlyTaskCount: number;
  monthlyCollabCount: number;
}

export function PlanStatus({ monthlyTaskCount, monthlyCollabCount }: PlanStatusProps) {
  const { currentUser } = useAuthStore();

  if (!currentUser) return null;

  const signupUrl = process.env.NEXT_PUBLIC_PARTY_SIGNUP_URL;
  const isLight = true; // TODO: Firestoreからプラン情報を取得

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <Badge variant={isLight ? 'default' : 'purple'}>{isLight ? 'LIGHT' : 'PARTY'}</Badge>
        <span className="text-sm font-medium text-zinc-700">プラン</span>
      </div>

      {isLight && (
        <div className="space-y-2 text-sm text-zinc-600">
          <div className="flex justify-between">
            <span>タスク作成（月）</span>
            <span>
              {monthlyTaskCount} / {LIGHT_PLAN_LIMITS.monthlyTasks}件
            </span>
          </div>
          <div className="flex justify-between">
            <span>コラボ日程（月）</span>
            <span>
              {monthlyCollabCount} / {LIGHT_PLAN_LIMITS.monthlyCollabs}件
            </span>
          </div>
        </div>
      )}

      {isLight && signupUrl && (
        <a
          href={signupUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          PARTYプランにアップグレード
        </a>
      )}
    </div>
  );
}
