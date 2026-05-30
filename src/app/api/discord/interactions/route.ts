import { NextRequest } from 'next/server';
import { verifyKey } from 'discord-interactions';
import { waitUntil } from '@vercel/functions';
import { z } from 'zod';
import { handleAiConversation } from './handlers/handleRisukerugg';
import { handleButtonClick } from './handlers/handleButtonClick';

/** Discord Interaction タイプ定数 */
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
} as const;

/** Zod スキーマ: Discord Interaction ペイロードのランタイムバリデーション */
const InteractionSchema = z.object({
  type: z.number(),
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

  const isValid = verifyKey(rawBody, signature, timestamp, publicKey);
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
  // Discord ユーザー ID: DM か サーバーかで取得元が異なる
  const discordUserId =
    interaction.member?.user?.id ?? interaction.user?.id ?? '';

  // ─── スラッシュコマンド ──────────────────────────────────
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    if (commandName === 'risukerugg') {
      const messageOption = interaction.data?.options?.find((o) => o.name === 'message');
      const userMessage = typeof messageOption?.value === 'string' ? messageOption.value : '';

      // 即座に Deferred Ephemeral Response を返す（Discord の 3 秒制限を回避）
      // waitUntil() でレスポンス送信後もバックグラウンド処理を継続
      waitUntil(handleAiConversation(discordUserId, userMessage, appId, token));

      return Response.json({
        type: 5,           // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: { flags: 64 }, // ephemeral（本人のみ表示）
      });
    }

    return Response.json({
      type: 4,
      data: { content: '未知のコマンドです。', flags: 64 },
    });
  }

  // ─── ボタンクリック ──────────────────────────────────────
  if (interaction.type === InteractionType.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id ?? '';
    const [action, targetUserId] = customId.split(':') as [string, string];

    if (
      (action === 'confirm' || action === 'revise' || action === 'cancel') &&
      targetUserId === discordUserId
    ) {
      // ボタンクリックも Deferred Response で応答し、処理をバックグラウンドで実行
      waitUntil(
        handleButtonClick({
          action,
          discordUserId,
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
