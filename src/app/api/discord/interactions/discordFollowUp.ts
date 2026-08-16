import type { ProposalData } from '@/lib/ai/parseProposal';

const DISCORD_API = 'https://discord.com/api/v10';

/** task_update の差分表示用: 対象タスクの現在値（handleRisukerugg で取得済みのタスク一覧を渡す） */
export interface TaskSummaryForDiff {
  id: string;
  title: string;
  columnName?: string;
  assigneeName?: string;
  dueDate?: string;
  description?: string;
}

/** task_update の changes フィールドの表示ラベル */
const CHANGE_FIELD_LABELS: Record<string, string> = {
  title: 'タイトル',
  dueDate: '期限',
  assigneeName: '担当',
  columnName: 'ステータス',
};

/** Embed フィールド上限（1024字）に収めるための切り詰め */
function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/**
 * Discord Follow-up メッセージを送信する（テキストのみ）。
 * Deferred Response 後のバックグラウンド処理から呼び出す。
 * flags なし = 通常投稿（チャンネルの全員に見える）。
 */
export async function sendFollowUp(
  appId: string,
  token: string,
  content: string
): Promise<void> {
  const res = await fetch(`${DISCORD_API}/webhooks/${appId}/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // flags を省略することで通常投稿（全員に見える）になる
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Discord Follow-up 送信失敗 (${res.status}):`, body);
  }
}

/**
 * %%PROPOSAL%% 検出時の確認メッセージを送信する（通常投稿）。
 * Embed でプロポーザル内容を表示し、3つのボタン（登録/修正/キャンセル）を添付する。
 * ボタンの custom_id は "{action}:{guildId}" 形式。
 * サーバー内の誰でもボタンを押せる（コマンド実行者への制限なし）。
 */
export async function sendProposalMessage(
  appId: string,
  token: string,
  proposals: ProposalData[],
  guildId: string,
  tasksForDiff: TaskSummaryForDiff[] = []
): Promise<void> {
  // プロポーザル内容を Embed フィールドに変換
  const fields = proposals.map((p, i) => {
    if (p.type === 'task_update') {
      // 既存タスクの更新: 変更前 → 変更後の差分を表示
      const current = tasksForDiff.find((t) => t.id === p.taskId);
      const lines: string[] = [];
      const c = p.changes;
      for (const [field, label] of Object.entries(CHANGE_FIELD_LABELS)) {
        const newValue = c[field as keyof typeof c];
        if (newValue === undefined) continue;
        const oldValue = current?.[field as keyof TaskSummaryForDiff] ?? 'なし';
        lines.push(`${label}: ${oldValue} → **${newValue}**`);
      }
      if (c.description !== undefined) {
        lines.push(`詳細（変更後）:\n${truncate(c.description, 600)}`);
      }
      return {
        name: proposals.length > 1 ? `✏️ タスク更新 (${i + 1})` : '✏️ タスク更新',
        value: truncate(`**${current?.title ?? `ID: ${p.taskId}`}**\n${lines.join('\n')}`, 1024),
        inline: false,
      };
    }
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
    // flags を省略 = 通常投稿（全員に見える）
    body: JSON.stringify({
      embeds: [
        {
          title: 'こんな感じでどう？',
          color: 0x5865f2,
          fields,
          footer: { text: '確認して登録してね（誰でも操作できます）' },
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
              custom_id: `confirm:${guildId}`,
            },
            {
              type: 2,
              style: 2, // SECONDARY（グレー）
              label: '✏️ 修正する',
              custom_id: `revise:${guildId}`,
            },
            {
              type: 2,
              style: 4, // DANGER（赤）
              label: '❌ キャンセル',
              custom_id: `cancel:${guildId}`,
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
