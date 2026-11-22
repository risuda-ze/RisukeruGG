'use client';

import { useAuthStore } from '@/stores/auth';
import { TopBar } from '@/components/layout/TopBar';
import { Card, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { DiscordSettingsSection } from '@/components/team/DiscordSettingsSection';

const STEPS = [
  {
    number: '1',
    title: 'Discordにログインする',
    description:
      'パソコンまたはスマホでDiscordを開いて、自分のアカウントにログインしておきましょう。',
    tip: 'Discordのアプリ、またはブラウザ（discord.com）から使えます。アカウントを持っていない場合は無料で作れます。',
  },
  {
    number: '2',
    title: 'Botをサーバーに追加する',
    description:
      '下にある「Botをサーバーに追加」ボタンを押すと、Discordの画面が開きます。通知を受け取りたいサーバー（コミュニティ）を選んで「認証」ボタンを押してください。',
    tip: 'サーバーの「管理者」権限がないとBotを追加できません。権限がない場合は、そのサーバーの管理者に相談してください。',
  },
  {
    number: '3',
    title: '通知チャンネルを選ぶ',
    description:
      'Botを追加すると自動でこのページに戻ってきます。Discordの「どのチャンネルに」通知を送るかを選んで、「保存する」を押してください。',
    tip: '「#general」「#通知」などのテキストチャンネルが一覧に表示されます。通知チャンネルは連携後にいつでも変更できます。',
  },
  {
    number: '4',
    title: '通知タイミングを設定する',
    description:
      '接続完了後、スケジュールを登録したとき・開始1時間前・開始15分前のどのタイミングで通知するかをオン/オフで設定できます。',
    tip: '後からいつでも変更できます。',
  },
];

export default function DiscordIntegrationPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentTeam = useAuthStore((s) => s.currentTeam);
  const members = useAuthStore((s) => s.members);
  const teamId = currentTeam?.id;
  const myMember = members.find((m) => m.userId === currentUser?.uid);
  const isMember = myMember?.role === 'member';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <TopBar title="Discord連携" />

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 space-y-5">
        {/* ── ヒーローカード（全幅） ───────────────────────── */}
        <div
          className="rounded-[18px] p-5 flex items-center gap-4"
          style={{
            background: 'rgba(88,101,242,0.08)',
            border: '1px solid rgba(88,101,242,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
            style={{ background: 'rgba(88,101,242,0.2)', color: '#5865F2' }}
          >
            <Icon name="discord" size={26} />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-text mb-1">Discord通知Bot</h2>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              DiscordサーバーにRisukeruGG Botを追加すると、スケジュール通知やAIアシスタントがDiscordで使えるようになります。
            </p>
          </div>
        </div>

        {/* ── チーム未参加 ─────────────────────────────────── */}
        {!teamId && (
          <Card noPadding>
            <div className="p-[18px]">
              <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                Discord連携を使うには、まずチームに参加してください。
              </p>
            </div>
          </Card>
        )}

        {/* ── PC: 2カラム / SP: 1カラム ─────────────────────── */}
        {teamId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:items-start">
            {/* 左: 連携の手順ガイド */}
            <Card noPadding>
              <CardHeader title="連携の手順" />
              <div className="p-[18px] space-y-6">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                      style={{ background: '#5865F2' }}
                    >
                      {step.number}
                    </div>
                    <div className="flex-1 -mt-0.5">
                      <p className="text-[14px] font-semibold text-text mb-1">{step.title}</p>
                      <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {step.description}
                      </p>
                      <div
                        className="mt-2 flex items-start gap-2 rounded-[8px] px-3 py-2 text-[12px]"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <span className="shrink-0">💡</span>
                        <span>{step.tip}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 右: 設定セクション */}
            <div className="space-y-5">
              <DiscordSettingsSection teamId={teamId} isMember={isMember} />
              {!isMember && (
                <p
                  className="text-[12px] text-center pb-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Discord連携の設定はチームの「メンバー」のみが行えます。
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
