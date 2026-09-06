import { getAdminFirestore } from '@/lib/firebase/admin';
import { AdminBriefsPort } from '@/lib/repositories/briefsAdmin';
import { changeStepStatus, OperationError } from '@/lib/briefs/operations';
import { sendFollowUp } from '../discordFollowUp';

const DISCORD_API = 'https://discord.com/api/v10';

interface StepButtonParams {
  action: 'step_done' | 'step_start';
  teamId: string;
  briefId: string;
  stepId: string;
  guildId: string;
  appId: string;
  token: string;
}

/**
 * ブリーフ工程のボタン（完了 / 着手）を処理する（IN-025）。
 *
 * - サーバー（guildId）が対象チームに連携されていることを確認する（他サーバーからの偽装防止）
 * - 操作層を Discord 由来（actorId null・role なし）で実行する。誰が押したかは記録しない
 * - 成功時は元メッセージを書き換え、要約更新・後続通知は Firestore トリガー側に任せる
 */
export async function handleStepButton({ action, teamId, briefId, stepId, guildId, appId, token }: StepButtonParams): Promise<void> {
  const db = getAdminFirestore();

  const configSnap = await db.doc(`teams/${teamId}/discord/config`).get();
  if (!configSnap.exists || configSnap.data()?.guildId !== guildId) {
    await sendFollowUp(appId, token, '❌ このサーバーはチームに連携されていません。');
    return;
  }

  const port = new AdminBriefsPort(db);
  const to = action === 'step_done' ? 'done' : 'in_progress';
  try {
    await changeStepStatus(
      port,
      { teamId, actorId: null, role: null, source: 'discord', now: new Date() },
      briefId,
      stepId,
      to
    );
  } catch (err) {
    const reason = err instanceof OperationError ? err.message : '操作に失敗しました。時間をおいて再度お試しください。';
    await sendFollowUp(appId, token, `❌ ${reason}`);
    return;
  }

  // 元メッセージを即時に書き換える（トリガー側の編集より先に反応を返す）
  const stepSnap = await db.doc(`teams/${teamId}/briefs/${briefId}/steps/${stepId}`).get();
  const title = (stepSnap.data()?.title as string | undefined) ?? '工程';
  const content =
    to === 'done'
      ? `✅ **【${title}】** 完了しました（完了）`
      : `🟨 **【${title}】** 作業中`;
  await editOriginalMessage(appId, token, {
    content,
    components:
      to === 'done'
        ? []
        : [
            {
              type: 1,
              components: [
                { type: 2, style: 3, label: '完了', custom_id: `step_done:${teamId}:${briefId}:${stepId}` },
              ],
            },
          ],
  });
}

/** Deferred Update 後に元のメッセージを書き換える */
async function editOriginalMessage(appId: string, token: string, payload: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${DISCORD_API}/webhooks/${appId}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`Discord 元メッセージ編集失敗 (${res.status}):`, body);
  }
}
