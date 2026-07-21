import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';
import { db, requireAuth } from '../lib/validateAuth';

// クローズドベータ利用申請（T11）。
// 既存のお問い合わせメール基盤（Gmail SMTP）と同じ Secret を再利用する:
//   GMAIL_USER         : 送受信に使う Gmail アドレス
//   GMAIL_APP_PASSWORD : Google アカウントで発行した App パスワード（16文字）
const gmailUser = defineSecret('GMAIL_USER');
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');

/**
 * クローズドベータの利用申請を受け付ける Callable Function。
 *
 * - `beta_requests/{uid}` に申請内容を記録する（ドキュメント ID = uid のため
 *   同一ユーザーの多重申請は上書きで抑止される）。
 * - 記録後、管理者（GMAIL_USER 宛）へ通知メールを送信する。メールは補助手段で、
 *   SMTP 失敗でも申請自体は成立させる（`mailNotified: false` を記録するのみ）。
 * - allowlist への昇格は管理者が `scripts/beta-allowlist.mjs` 等で手動実施する。
 */
export const requestBetaAccess = onCall(
  {
    region: 'asia-northeast1',
    secrets: [gmailUser, gmailAppPassword],
  },
  async (request: CallableRequest) => {
    const uid = requireAuth(request);

    // Auth からユーザー情報を取得（メール・表示名）
    let userEmail = '(メールアドレス未登録)';
    let userName = '(名前未登録)';
    try {
      const userRecord = await getAuth().getUser(uid);
      userEmail = userRecord.email ?? '(メールアドレス未登録)';
      userName = userRecord.displayName ?? '(名前未登録)';
    } catch {
      // 取得失敗しても記録・送信は続行する
    }

    // Firestore に申請を記録（uid をドキュメント ID とし多重申請は上書き）
    await db.doc(`beta_requests/${uid}`).set(
      {
        uid,
        email: userEmail,
        displayName: userName,
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const emailText = `
クローズドベータの利用申請を受け付けました。

【申請者】${userName} (${userEmail})
【UID】${uid}

コンソールまたは scripts/beta-allowlist.mjs で beta_allowlist へ登録してください。
`.trim();

    // Gmail SMTP トランスポーターを作成
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser.value(),
        pass: gmailAppPassword.value(),
      },
    });

    let mailNotified = true;
    try {
      await transporter.sendMail({
        from: `"リスケるGG ベータ申請" <${gmailUser.value()}>`,
        to: gmailUser.value(), // 運営者（自分自身）宛に届く
        replyTo: userEmail !== '(メールアドレス未登録)' ? userEmail : undefined,
        subject: `[リスケるGG ベータ申請] ${userName} (${userEmail})`,
        text: emailText,
      });
    } catch (err) {
      // 申請は Firestore 記録済みのため、通知メールの失敗で申請自体を失敗させない。
      // 管理者は beta_requests コレクション（mailNotified: false）で検知できる。
      console.error('Gmail SMTP error:', err);
      mailNotified = false;
    }

    await db
      .doc(`beta_requests/${uid}`)
      .set({ mailNotified }, { merge: true })
      .catch(() => {});

    return { success: true, mailNotified };
  }
);
