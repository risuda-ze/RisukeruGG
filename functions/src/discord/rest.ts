import { logger } from 'firebase-functions/v2';

/**
 * Discord REST API の薄いラッパー（Bot トークン使用、すべて best-effort）。
 * 失敗はログに記録して null を返し、呼び出し元の Firestore 処理を失敗させない。
 */

const DISCORD_API = 'https://discord.com/api/v10';

/** メッセージ本文（content と components のみ使う） */
export interface DiscordMessagePayload {
  content: string;
  components?: DiscordActionRow[];
  /** メンションの暗黙展開を抑え、明示した ID だけ通知する */
  allowed_mentions?: { parse: string[]; users?: string[] };
}

export interface DiscordChannel {
  id: string;
  type: number;
}

export interface DiscordButton {
  type: 2;
  /** 1 primary / 2 secondary / 3 success / 4 danger / 5 link */
  style: 1 | 2 | 3 | 4 | 5;
  label: string;
  custom_id?: string;
  url?: string;
  disabled?: boolean;
}

export interface DiscordActionRow {
  type: 1;
  components: DiscordButton[];
}

function headers(botToken: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bot ${botToken}` };
}

function getBotToken(): string | null {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) logger.warn('DISCORD_BOT_TOKEN が設定されていません。Discord 送信をスキップします。');
  return token ?? null;
}

/** 指定したDiscordサーバーのチャンネル一覧を取得する。 */
export async function listGuildChannels(guildId: string): Promise<DiscordChannel[] | null> {
  const botToken = getBotToken();
  if (!botToken) return null;
  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: headers(botToken),
    });
    if (!res.ok) {
      logger.warn(`Discord チャンネル一覧取得失敗: HTTP ${res.status}`, {
        body: await res.text().catch(() => ''),
      });
      return null;
    }
    return (await res.json()) as DiscordChannel[];
  } catch (err) {
    logger.warn('Discord チャンネル一覧取得中に例外が発生しました', { err });
    return null;
  }
}

/** チャンネル直下に公開スレッドを作る。返り値はスレッド（チャンネル）ID */
export async function createPublicThread(channelId: string, name: string): Promise<string | null> {
  const botToken = getBotToken();
  if (!botToken) return null;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/threads`, {
      method: 'POST',
      headers: headers(botToken),
      body: JSON.stringify({
        name: name.slice(0, 100),
        type: 11, // PUBLIC_THREAD
        auto_archive_duration: 10080, // 7 日
      }),
    });
    if (!res.ok) {
      logger.warn(`Discord スレッド作成失敗: HTTP ${res.status}`, {
        body: await res.text().catch(() => ''),
      });
      return null;
    }
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch (err) {
    logger.warn('Discord スレッド作成中に例外が発生しました', { err });
    return null;
  }
}

/** メッセージを送る。返り値はメッセージ ID */
export async function sendMessage(
  channelId: string,
  payload: DiscordMessagePayload
): Promise<string | null> {
  const botToken = getBotToken();
  if (!botToken) return null;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headers(botToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn(`Discord メッセージ送信失敗: HTTP ${res.status}`, {
        body: await res.text().catch(() => ''),
      });
      return null;
    }
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch (err) {
    logger.warn('Discord メッセージ送信中に例外が発生しました', { err });
    return null;
  }
}

/** Bot 自身のメッセージを編集する */
export async function editMessage(
  channelId: string,
  messageId: string,
  payload: DiscordMessagePayload
): Promise<boolean> {
  const botToken = getBotToken();
  if (!botToken) return false;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages/${messageId}`, {
      method: 'PATCH',
      headers: headers(botToken),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      logger.warn(`Discord メッセージ編集失敗: HTTP ${res.status}`, {
        body: await res.text().catch(() => ''),
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Discord メッセージ編集中に例外が発生しました', { err });
    return false;
  }
}

/** チャンネル名を変更する。 */
export async function editChannelName(channelId: string, name: string): Promise<boolean> {
  const botToken = getBotToken();
  if (!botToken) return false;
  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}`, {
      method: 'PATCH',
      headers: headers(botToken),
      body: JSON.stringify({ name: name.slice(0, 100) }),
    });
    if (!res.ok) {
      logger.warn(`Discord チャンネル名変更失敗: HTTP ${res.status}`, {
        body: await res.text().catch(() => ''),
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn('Discord チャンネル名変更中に例外が発生しました', { err });
    return false;
  }
}
