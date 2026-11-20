/** 日付（`yyyy-mm-dd`）→ 日マスク。日マスクはビット h（0〜23）が h:00〜h+1:00 の対応不可を表す */
export type DayMasks = Record<string, number>;

/** 対応不可メモ。対応不可とは独立に、同一日内・1 時間単位の時間帯へ付ける補足 */
export interface UnavailabilityNote {
  /** 月ドキュメント内で一意な ID。編集・削除の対象を特定する */
  id: string;
  /** 対象日（`yyyy-mm-dd`） */
  date: string;
  /** 開始時（0〜23。その時を含む） */
  start: number;
  /** 終了時（1〜24。排他的境界） */
  end: number;
  /** 本文（1〜100 字） */
  text: string;
}

/** 1 人・1 ヶ月の対応不可（`teams/{teamId}/unavailability/{userId}_{yyyy-mm}`） */
export interface UnavailabilityMonth {
  userId: string;
  /** 対象月（`yyyy-mm`、JST） */
  month: string;
  /** 対応不可がある日だけを持つ */
  days: DayMasks;
  notes: UnavailabilityNote[];
  /** 最後に保存した日時。一覧の「最終更新」に使う */
  updatedAt: Date;
}
