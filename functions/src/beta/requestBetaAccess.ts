import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
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
 * - 記録後、管理者（GMAIL_USER 宛）へ通知メールを送信する。管理者は主にメールで
 *   申請に気づくため、送信失敗を握りつぶすと申請が放置される。失敗時は
 *   `mailNotified: false` を記録した上でエラーを返し、失敗を可視化する
 *   （申請の記録自体は完了していることをメッセージで伝える）。
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

    try {
      await transporter.sendMail({
        from: `"リスケるGG ベータ申請" <${gmailUser.value()}>`,
        to: gmailUser.value(), // 運営者（自分自身）宛に届く
        replyTo: userEmail !== '(メールアドレス未登録)' ? userEmail : undefined,
        subject: `[リスケるGG ベータ申請] ${userName} (${userEmail})`,
        text: emailText,
      });
    } catch (err) {
      // 通知メールが届かないと管理者が申請に気づけないため、失敗は隠さずエラーで返す。
      // 申請の記録は完了しているので、その旨をメッセージで申請者へ伝える。
      console.error('Gmail SMTP error:', err);
      await db
        .doc(`beta_requests/${uid}`)
        .set({ mailNotified: false }, { merge: true })
        .catch(() => {});
      throw new HttpsError(
        'internal',
        '申請は記録されましたが、運営への通知メールの送信に失敗しました。時間をおいて再度お試しください'
      );
    }

    await db
      .doc(`beta_requests/${uid}`)
      .set({ mailNotified: true }, { merge: true })
      .catch(() => {});

    return { success: true };
  }
);
