import { onCall, CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import * as nodemailer from 'nodemailer';
import { db, requireAuth } from '../lib/validateAuth';

// Firebase Secret に登録する値:
//   GMAIL_USER         : 送受信に使う Gmail アドレス（例: yourapp@gmail.com）
//   GMAIL_APP_PASSWORD : Google アカウントで発行した App パスワード（16文字）
const gmailUser = defineSecret('GMAIL_USER');
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');

/** お問い合わせ種別 */
const INQUIRY_TYPES = ['bug', 'feature', 'question'] as const;
type InquiryType = (typeof INQUIRY_TYPES)[number];

const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  bug: 'バグ報告',
  feature: '機能追加リクエスト',
  question: '一般的なご質問',
};

interface SendContactEmailData {
  type: InquiryType;
  subject: string;
  body: string;
}

/** お問い合わせメール送信 Cloud Function（Gmail SMTP） */
export const sendContactEmail = onCall(
  {
    region: 'asia-northeast1',
    secrets: [gmailUser, gmailAppPassword],
  },
  async (request: CallableRequest<SendContactEmailData>) => {
    const uid = requireAuth(request);
    const { type, subject, body } = request.data;

    // バリデーション
    if (!INQUIRY_TYPES.includes(type)) {
      throw new HttpsError('invalid-argument', '問い合わせ種別が正しくありません');
    }
    if (!subject || subject.trim().length === 0) {
      throw new HttpsError('invalid-argument', '件名を入力してください');
    }
    if (subject.trim().length > 100) {
      throw new HttpsError('invalid-argument', '件名は100文字以内で入力してください');
    }
    if (!body || body.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'お問い合わせ内容を入力してください');
    }
    if (body.trim().length > 2000) {
      throw new HttpsError('invalid-argument', 'お問い合わせ内容は2000文字以内で入力してください');
    }

    // ユーザー情報を取得
    let userEmail = '(メールアドレス未登録)';
    let userName = '(名前未登録)';
    try {
      const userRecord = await getAuth().getUser(uid);
      userEmail = userRecord.email ?? '(メールアドレス未登録)';
      userName = userRecord.displayName ?? '(名前未登録)';
    } catch {
      // 取得失敗しても送信は続行
    }

    const typeLabel = INQUIRY_TYPE_LABELS[type];
    const emailText = `
お問い合わせを受け付けました。

【種別】${typeLabel}
【件名】${subject.trim()}
【送信者】${userName} (${userEmail})
【UID】${uid}

【内容】
${body.trim()}
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
        from: `"リスケるGG お問い合わせ" <${gmailUser.value()}>`,
        to: gmailUser.value(), // 自分自身（運営者）宛に届く
        replyTo: userEmail !== '(メールアドレス未登録)' ? userEmail : undefined,
        subject: `[リスケるGG お問い合わせ] ${typeLabel}: ${subject.trim()}`,
        text: emailText,
      });
    } catch (err) {
      console.error('Gmail SMTP error:', err);
      throw new HttpsError('internal', 'メールの送信に失敗しました。しばらくしてからお試しください');
    }

    // Firestore に送信記録を保存
    await db.collection('inquiries').add({
      uid,
      userEmail,
      userName,
      type,
      subject: subject.trim(),
      body: body.trim(),
      sentAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  }
);
