'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dropdown } from '@/components/ui/Dropdown';
import { Input, fieldLabelClass } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { monthOf } from '@/lib/unavailability/range';
import { MAX_NOTES_PER_MONTH } from '@/lib/validations/unavailability';
import type { UnavailabilityNote } from '@/types/unavailability';

export type NoteFields = Omit<UnavailabilityNote, 'id'>;

interface NoteFormProps {
  /** 編集なら true（削除ボタンを出す） */
  editing: boolean;
  initial: NoteFields;
  /** 入力できる日付の範囲（前月 1 日〜翌月末日） */
  minDate: string;
  maxDate: string;
  /** その日付の月を読み込み済みか（未読込の月にはメモを書けない） */
  isLoaded: (date: string) => boolean;
  /** その月の、編集中のメモを除いたメモの件数（保存済みと未保存の追加の合計） */
  countOthers: (month: string) => number;
  onSubmit: (fields: NoteFields) => void;
  onDelete: () => void;
  onClose: () => void;
}

const MAX_TEXT = 100;
const hourOptions = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    value: String(from + i),
    label: `${String(from + i).padStart(2, '0')}:00`,
  }));
export const START_OPTIONS = hourOptions(0, 23);
export const END_OPTIONS = hourOptions(1, 24);

/** メモの追加・編集フォーム（UN-030〜UN-035）。確定しても Firestore には書かず、未保存の変更として親に渡す */
export function NoteForm({
  editing,
  initial,
  minDate,
  maxDate,
  isLoaded,
  countOthers,
  onSubmit,
  onDelete,
  onClose,
}: NoteFormProps) {
  const [fields, setFields] = useState(initial);
  const [submitted, setSubmitted] = useState(false);

  const text = fields.text.trim();
  const dateError =
    fields.date < minDate || fields.date > maxDate
      ? '前月 1 日〜翌月末日の日付を指定してください'
      : !isLoaded(fields.date)
        ? 'この月はまだ読み込み中です。少し待ってからやり直してください'
        : undefined;
  const timeError = fields.start >= fields.end ? '終了は開始より後にしてください' : undefined;
  const textError =
    text.length === 0
      ? 'メモを入力してください'
      : text.length > MAX_TEXT
        ? `${MAX_TEXT} 字以内で入力してください`
        : undefined;
  // 上限は入力前から示す（UN-034）
  const full = !dateError && countOthers(monthOf(fields.date)) >= MAX_NOTES_PER_MONTH;

  const submit = () => {
    setSubmitted(true);
    if (dateError || timeError || textError || full) return;
    onSubmit({ ...fields, text });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'メモを編集' : 'メモを追加'}
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={onDelete} className="mr-auto">
              削除
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={full}>
            {editing ? '変更' : '追加'}
          </Button>
        </>
      }
    >
      <div data-testid="un-note-form" className="flex flex-col gap-4">
        <Input
          id="un-note-date"
          type="date"
          label="日付"
          value={fields.date}
          min={minDate}
          max={maxDate}
          onChange={(e) => setFields({ ...fields, date: e.target.value })}
          error={submitted ? dateError : undefined}
        />
        <div className="flex flex-col gap-1.5">
          <div className="flex items-end gap-3">
            {/* label で包み、ドロップダウンのボタンに名前を付ける */}
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={fieldLabelClass}>開始</span>
              <Dropdown
                options={START_OPTIONS}
                value={String(fields.start)}
                onChange={(value) => setFields({ ...fields, start: Number(value) })}
                scroll
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={fieldLabelClass}>終了</span>
              <Dropdown
                options={END_OPTIONS}
                value={String(fields.end)}
                onChange={(value) => setFields({ ...fields, end: Number(value) })}
                scroll
              />
            </label>
          </div>
          {timeError && <p className="text-caption text-danger">{timeError}</p>}
        </div>
        <Textarea
          id="un-note-text"
          label="メモ"
          value={fields.text}
          maxLength={MAX_TEXT}
          placeholder="例: 返信は遅れます、通話は不可"
          onChange={(e) => setFields({ ...fields, text: e.target.value })}
          error={submitted ? textError : undefined}
          hint={`予定の内容ではなく、補足を書いてください（${fields.text.length} / ${MAX_TEXT} 字）`}
        />
        {full && (
          <p role="alert" className="text-caption text-danger">
            この月のメモは上限（{MAX_NOTES_PER_MONTH} 件）に達しているため、追加できません。
          </p>
        )}
      </div>
    </Modal>
  );
}
