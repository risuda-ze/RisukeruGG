'use client';

import { useAuthStore } from '@/stores/auth';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LIGHT_PLAN_LIMITS } from '@/types/entities';
import { isPartyPlan } from '@/lib/plan';

interface PlanStatusProps {
  monthlyTaskCount: number;
  monthlyCollabCount: number;
}

export function PlanStatus({ monthlyTaskCount, monthlyCollabCount }: PlanStatusProps) {
  const currentUser = useAuthStore((s) => s.currentUser);
  const members = useAuthStore((s) => s.members);

  if (!currentUser) return null;

  const signupUrl = process.env.NEXT_PUBLIC_PARTY_SIGNUP_URL;
  const myMember = members.find((m) => m.userId === currentUser.uid);
  const isLight = !isPartyPlan(myMember?.plan);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={isLight ? 'muted' : 'purple'}>{isLight ? 'LIGHT' : 'PARTY'}</Badge>
        <span className="text-sm text-muted">現在のプラン</span>
      </div>

      {isLight && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted">
            <span>タスク作成（月）</span>
            <span className="font-num">
              {monthlyTaskCount} / {LIGHT_PLAN_LIMITS.monthlyTasks}件
            </span>
          </div>
          <div className="flex justify-between text-muted">
            <span>コラボ日程（月）</span>
            <span className="font-num">
              {monthlyCollabCount} / {LIGHT_PLAN_LIMITS.monthlyCollabs}件
            </span>
          </div>
        </div>
      )}

      {isLight && signupUrl && (
        <a href={signupUrl} target="_blank" rel="noopener noreferrer" className="block">
          <Button variant="amber" className="w-full">
            PARTYプランにアップグレード
          </Button>
        </a>
      )}
    </div>
  );
}
