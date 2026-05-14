import { messaging } from '../lib/admin';
import { db } from '../lib/admin';
import { logger } from 'firebase-functions/v2';

export async function sendFcmToUser(
  uid: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  const userSnap = await db.doc(`users/${uid}`).get();
  if (!userSnap.exists) return;

  const tokens = (userSnap.data()?.fcmTokens as string[]) ?? [];
  if (tokens.length === 0) return;

  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
  });

  // 無効なトークンを削除
  const invalidTokens: string[] = [];
  response.responses.forEach((resp, index) => {
    if (!resp.success) {
      const errorCode = resp.error?.code;
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[index]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    const validTokens = tokens.filter((t) => !invalidTokens.includes(t));
    await db.doc(`users/${uid}`).update({ fcmTokens: validTokens });
    logger.info(`無効なFCMトークンを削除: ${uid}`, invalidTokens);
  }
}
