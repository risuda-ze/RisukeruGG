'use client';

import { TopBar } from '@/components/layout/TopBar';
import { UnavailabilityBoard } from '@/components/unavailability/UnavailabilityBoard';
import { useAuthStore } from '@/stores/auth';

export default function UnavailabilityPage() {
  const currentTeamId = useAuthStore((s) => s.currentTeamId);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar
        title="対応不可時間"
        subtitle="メンバー・スタッフが対応できない日・時間帯を確認できます"
      />
      {/* チームを切り替えたら購読と表示状態を作り直す */}
      {currentTeamId && <UnavailabilityBoard key={currentTeamId} teamId={currentTeamId} />}
    </div>
  );
}
