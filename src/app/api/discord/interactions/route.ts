import { NextRequest } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { handleAiConversation } from './handlers/handleRisukerugg';
import { handleButtonClick } from './handlers/handleButtonClick';
import { handleStepButton } from './handlers/handleStepButton';

/** Discord Interaction タイプ定数 */
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
} as const;

/** Zod スキーマ: Discord Interaction ペイロードのランタイムバリデーション */
const InteractionSchema = z.object({
  type: z.number(),
  guild_id: z.string().optional(),  // サーバー内コマンドの場合に含まれる（DM では undefined）
  id: z.string().optional(),
  token: z.string().optional(),
  application_id: z.string().optional(),
  data: z
    .object({
      name: z.string().optional(),
      custom_id: z.string().optional(),
      options: z
        .array(
          z.object({
            name: z.string(),
            value: z.unknown(),
          })
        )
        .optional(),
    })
    .optional(),
  member: z
    .object({
      user: z.object({ id: z.string() }).optional(),
    })
    .optional(),
  user: z.object({ id: z.string() }).optional(),
});

/**
 * Discord Interactions Endpoint (POST)。
 * 全ての Discord インタラクション（スラッシュコマンド・ボタン）を受け取る。
 *
 * 署名検証: DISCORD_PUBLIC_KEY で Ed25519 署名を検証。不正リクエストは HTTP 401。
 * Deferred Response: 3秒制限を回避するため AI 処理は waitUntil() でバックグラウンド実行。
 * チーム特定: guild_id で teams/{teamId}/discord/config を検索する（discordUserId は使用しない）。
 */
export async function POST(req: NextRequest): Promise<Response> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  const appId = process.env.DISCORD_APPLICATION_ID;

  if (!publicKey || !appId) {
    return Response.json({ error: 'Discord 環境変数が設定されていません' }, { status: 503 });
  }

  // 署名検証: request.text() で生の body を取得（request.json() だと署名が壊れる）
  const signature = req.headers.get('x-signature-ed25519') ?? '';
  const timestamp = req.headers.get('x-signature-timestamp') ?? '';
  const rawBody = await req.text();

  // discord-interactions v4 で verifyKey は非同期（Promise<boolean>）になった。
  // await しないと Promise が常に truthy 扱いになり署名検証がバイパスされ、
  // 無効署名にも 200 を返してしまう → Discord がエンドポイントを不正と判断し無効化 →
  // 「アプリケーションが応答しませんでした」の原因になる。必ず await する。
  let isValid = false;
  try {
    isValid = await verifyKey(rawBody, signature, timestamp, publicKey);
  } catch {
    // 署名やタイムスタンプの形式が壊れている場合も検証失敗として扱う
    isValid = false;
  }
  if (!isValid) {
    return new Response('Invalid signature', { status: 401 });
  }

  // ペイロードのパース & バリデーション
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = InteractionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid interaction payload' }, { status: 400 });
  }

  const interaction = parsed.data;

  // ─── PING (Discord の疎通確認) ────────────────────────────
  if (interaction.type === InteractionType.PING) {
    return Response.json({ type: 1 });
  }

  const token = interaction.token ?? '';

  // ─── スラッシュコマンド ──────────────────────────────────
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    if (commandName === 'risukerugg') {
      // DM からのコマンドは guild_id が存在しない → サーバー内で実行するよう案内
      const guildId = interaction.guild_id;
      if (!guildId) {
        return Response.json({
          type: 4,
          data: {
            content:
              '❌ このコマンドはDiscordサーバー内でのみ使用できます。\nチームのDiscordサーバーで実行してください。',
          },
        });
      }

      const messageOption = interaction.data?.options?.find((o) => o.name === 'message');
      const userMessage = typeof messageOption?.value === 'string' ? messageOption.value : '';
      const discordUserId = interaction.member?.user?.id ?? interaction.user?.id ?? '';

      waitUntil(handleAiConversation(guildId, userMessage, discordUserId, appId, token));

      return Response.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: {},  // flags なし = 通常投稿
      });
    }

    return Response.json({
      type: 4,
      data: { content: '未知のコマンドです。' },
    });
  }

  // ─── ボタンクリック ──────────────────────────────────────
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id ?? '';

    // ブリーフ工程のボタン: "step_done|step_start:{teamId}:{briefId}:{stepId}"（IN-025）
    if (customId.startsWith('step_done:') || customId.startsWith('step_start:')) {
      const [stepAction, teamId, briefId, stepId] = customId.split(':');
      const guildId = interaction.guild_id;
      if (guildId && teamId && briefId && stepId && (stepAction === 'step_done' || stepAction === 'step_start')) {
        waitUntil(handleStepButton({ action: stepAction, teamId, briefId, stepId, guildId, appId, token }));
        return Response.json({ type: 6 }); // DEFERRED_UPDATE_MESSAGE
      }
      return Response.json({ type: 4, data: { content: '❌ このボタンはサーバー内でのみ使えます。' } });
    }
    // custom_id は "{action}:{guildId}" 形式
    const colonIdx = customId.indexOf(':');
    const action = customId.slice(0, colonIdx);
    const targetGuildId = customId.slice(colonIdx + 1);
    const guildId = interaction.guild_id ?? targetGuildId;

    if (
      (action === 'confirm' || action === 'revise' || action === 'cancel') &&
      targetGuildId === guildId
    ) {
      // ボタンクリックも Deferred Response で応答し、処理をバックグラウンドで実行
      const buttonDiscordUserId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
      waitUntil(
        handleButtonClick({
          action,
          guildId,
          discordUserId: buttonDiscordUserId,
          appId,
          token,
        })
      );

      return Response.json({
        type: 6, // DEFERRED_UPDATE_MESSAGE（ボタンの loading state を表示）
      });
    }
  }

  return Response.json({ type: 1 });
}
