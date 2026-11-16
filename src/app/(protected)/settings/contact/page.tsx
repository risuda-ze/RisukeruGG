'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase/client';
import { TopBar } from '@/components/layout/TopBar';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type InquiryType = 'bug' | 'feature' | 'question';

const INQUIRY_TYPE_OPTIONS: { value: InquiryType; label: string; description: string }[] = [
  {
    value: 'bug',
    label: 'バグ報告',
    description: '動作がおかしい・エラーが発生する',
  },
  {
    value: 'feature',
    label: '機能追加リクエスト',
    description: 'こんな機能があったらいいな',
  },
  {
    value: 'question',
    label: '一般的なご質問',
    description: '使い方・その他のお問い合わせ',
  },
];

const MAX_SUBJECT_LENGTH = 100;
const MAX_BODY_LENGTH = 2000;

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const [type, setType] = useState<InquiryType>('question');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const subjectError =
    subject.length > MAX_SUBJECT_LENGTH
      ? `件名は${MAX_SUBJECT_LENGTH}文字以内で入力してください`
      : null;
  const bodyError =
    body.length > MAX_BODY_LENGTH
      ? `内容は${MAX_BODY_LENGTH}文字以内で入力してください`
      : null;
  const isValid =
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    !subjectError &&
    !bodyError;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || formState === 'submitting') return;

    setFormState('submitting');
    setErrorMessage(null);

    try {
      const sendContactEmail = httpsCallable(functions, 'sendContactEmail');
      await sendContactEmail({ type, subject: subject.trim(), body: body.trim() });
      setFormState('success');
    } catch (err: unknown) {
      setFormState('error');
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        typeof (err as { message: unknown }).message === 'string'
      ) {
        setErrorMessage((err as { message: string }).message);
      } else {
        setErrorMessage('送信に失敗しました。しばらくしてからお試しください');
      }
    }
  }

  function handleReset() {
    setType('question');
    setSubject('');
    setBody('');
    setFormState('idle');
    setErrorMessage(null);
  }

  return (
    <div className="flex flex-col min-h-screen bg-bg">
      <TopBar title="お問い合わせ" />

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-7 max-w-3xl">
        {/* 送信成功メッセージ */}
        {formState === 'success' ? (
          <Card>
            <div className="text-center py-8">
              <div className="mb-4 flex justify-center" style={{ color: 'var(--green)' }}>
                <Icon name="check" size={48} />
              </div>
              <h2 className="text-lg font-semibold text-text mb-2">送信しました</h2>
              <p className="text-sm text-text-muted mb-6">
                お問い合わせを受け付けました。
                <br />
                内容を確認し、担当者よりご連絡する場合があります。
              </p>
              <Button variant="secondary" onClick={handleReset}>
                新しいお問い合わせを送る
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* エラーバナー */}
            {formState === 'error' && errorMessage && (
              <div className="rounded-[10px] bg-live/10 border border-live/30 px-4 py-3 text-sm text-live">
                {errorMessage}
              </div>
            )}

            {/* 問い合わせ種別 */}
            <Card>
              <h3 className="text-sm font-semibold text-text mb-3">
                問い合わせ種別
                <span className="text-live ml-1">*</span>
              </h3>
              <div className="space-y-2">
                {INQUIRY_TYPE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-[10px] border cursor-pointer transition-colors ${
                      type === option.value
                        ? 'border-purple bg-purple/8'
                        : 'border-border hover:border-purple/40 hover:bg-purple/4'
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option.value}
                      checked={type === option.value}
                      onChange={() => setType(option.value)}
                      className="sr-only"
                    />
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        type === option.value
                          ? 'border-purple'
                          : 'border-border'
                      }`}
                    >
                      {type === option.value && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: 'var(--purple)' }}
                        />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">{option.label}</p>
                      <p className="text-[11px] text-text-muted">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Card>

            {/* 件名 */}
            <Card>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="subject" className="text-sm font-semibold text-text">
                    件名
                    <span className="text-live ml-1">*</span>
                  </label>
                  <span
                    className={`text-[11px] ${subject.length > MAX_SUBJECT_LENGTH ? 'text-live' : 'text-text-muted'}`}
                  >
                    {subject.length} / {MAX_SUBJECT_LENGTH}
                  </span>
                </div>
                <input
                  id="subject"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="お問い合わせの件名を入力してください"
                  className={`w-full rounded-[10px] border px-3 py-2.5 text-sm text-text bg-bg placeholder:text-text-muted/50 outline-none transition-colors focus:border-purple ${
                    subjectError ? 'border-live' : 'border-border'
                  }`}
                  disabled={formState === 'submitting'}
                />
                {subjectError && (
                  <p className="text-[11px] text-live mt-1">{subjectError}</p>
                )}
              </div>
            </Card>

            {/* 内容 */}
            <Card>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="body" className="text-sm font-semibold text-text">
                    内容
                    <span className="text-live ml-1">*</span>
                  </label>
                  <span
                    className={`text-[11px] ${body.length > MAX_BODY_LENGTH ? 'text-live' : 'text-text-muted'}`}
                  >
                    {body.length} / {MAX_BODY_LENGTH}
                  </span>
                </div>
                <textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="お問い合わせの内容を詳しくご記入ください"
                  rows={8}
                  className={`w-full rounded-[10px] border px-3 py-2.5 text-sm text-text bg-bg placeholder:text-text-muted/50 outline-none transition-colors focus:border-purple resize-y min-h-[120px] ${
                    bodyError ? 'border-live' : 'border-border'
                  }`}
                  disabled={formState === 'submitting'}
                />
                {bodyError && (
                  <p className="text-[11px] text-live mt-1">{bodyError}</p>
                )}
              </div>
            </Card>

            {/* 送信ボタン */}
            <div className="flex justify-end pb-6">
              <Button
                type="submit"
                variant="primary"
                loading={formState === 'submitting'}
                disabled={!isValid || formState === 'submitting'}
                className="min-w-[120px]"
              >
                送信する
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
