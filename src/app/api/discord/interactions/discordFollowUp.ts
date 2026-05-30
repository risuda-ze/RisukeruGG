import type { ProposalData } from '@/lib/ai/parseProposal';

const DISCORD_API = 'https://discord.com/api/v10';

/**
 * Discord Follow-up メッセージを送信する（テキストのみ）。
 * Deferred Response 後のバックグラウンド処理から呼び出す。
 */
export async function sendFollowUp(
  appId: string,
  token: string,
  content: string,
  flags: number = 64  // デフォルト ephemeral（本人のみ表示）
): Promise<void> {
  const res = await fetch(`${DISCORD_API}/webhooks/${appId}/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, flags }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Discord Follow-up 送信失敗 (${res.status}):`, body);
  }
}

/**
 * %%PROPOSAL%% 検出時の確認メッセージを送信する。
 * Embed でプロポーザル内容を表示し、3つのボタン（登録/修正/キャンセル）を添付する。
 */
export async function sendProposalMessage(
  appId: string,
  token: string,
  proposals: ProposalData[],
  discordUserId: string
): Promise<void> {
  // プロポーザル内容を Embed フィールドに変換
  const fields = proposals.map((p, i) => {
    if (p.type === 'schedule') {
      const start = new Date(p.startAt);
      const end = new Date(p.endAt);
      const dateStr = `${start.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' })} ${start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}〜${end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
      return {
        name: proposals.length > 1 ? `📅 スケジュール (${i + 1})` : '📅 スケジュール',
        value: `**${p.title}**\n${dateStr}${p.description ? `\n${p.description}` : ''}`,
        inline: false,
      };
    } else if (p.type === 'task') {
      return {
        name: proposals.length > 1 ? `✅ タスク (${i + 1})` : '✅ タスク',
        value: `**${p.title}**${p.dueDate ? `\n期限: ${p.dueDate}` : ''}${p.assigneeName ? `\n担当: ${p.assigneeName}` : ''}`,
        inline: false,
      };
    } else {
      // collab
      const dates = p.proposedDates
        .map((d) =>
          new Date(d).toLocaleDateString('ja-JP', {
            month: 'numeric',
            day: 'numeric',
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })
        )
        .join(', ');
      return {
        name: proposals.length > 1 ? `🤝 コラボ調整 (${i + 1})` : '🤝 コラボ調整',
        value: `**${p.title}**\n相手: ${p.partnerName}\n候補日: ${dates}`,
        inline: false,
      };
    }
  });

  const res = await fetch(`${DISCORD_API}/webhooks/${appId}/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flags: 64, // ephemeral
      embeds: [
        {
          title: 'こんな感じでどう？',
          color: 0x5865f2,
          fields,
          footer: { text: '確認して登録してね' },
        },
      ],
      components: [
        {
          type: 1, // ACTION_ROW
          components: [
            {
              type: 2, // BUTTON
              style: 3, // SUCCESS（緑）
              label: '✅ 登録する',
              custom_id: `confirm:${discordUserId}`,
            },
            {
              type: 2,
              style: 2, // SECONDARY（グレー）
              label: '✏️ 修正する',
              custom_id: `revise:${discordUserId}`,
            },
            {
              type: 2,
              style: 4, // DANGER（赤）
              label: '❌ キャンセル',
              custom_id: `cancel:${discordUserId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Discord Proposal メッセージ送信失敗 (${res.status}):`, body);
  }
}
