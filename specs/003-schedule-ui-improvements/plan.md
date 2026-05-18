# Implementation Plan: スケジュール・UI改善

**Branch**: `003-schedule-ui-improvements` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification — ユーザーからの修正・変更・追加要件

## Summary

カスタムカレンダー実装（date-fns ベース）のマルチデイイベント表示修正、週開始曜日の日曜日への変更、マークダウン対応入力フォーム、フォームドラフト保存、スケジュールカードへのアイコン表示、日付＋時間コンポーネント統一、終日選択機能、複数チーム同時所属＋チームスイッチャーを実装する。

## Technical Context

**Language/Version**: TypeScript 5 + Next.js 14 (App Router)  
**Primary Dependencies**: date-fns、Tailwind CSS 4、Zustand、React Hook Form + Zod、Firebase Firestore  
**Storage**: Firebase Firestore (`teams/{teamId}/schedules`)  
**Testing**: Vitest (unit)、Playwright (E2E)  
**Target Platform**: Web (Vercel)  
**Project Type**: Web Application (Next.js App Router)  
**Performance Goals**: UI操作は 100ms 以内に応答  
**Constraints**: 既存の ScheduleEntry 型を破壊的に変更しない  
**Scale/Scope**: チーム単位で運用するスケジュール・タスク管理 SaaS

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. シンプルさ優先 | ✅ PASS | 新ライブラリは react-markdown のみ追加。最小限の変更。 |
| II. TypeScript 型安全 | ✅ PASS | 既存型を拡張するのみ。any 禁止を継続。 |
| III. テスト方針 | ✅ PASS | UIテストは不要。ロジック（マルチデイ計算、終日計算）のみユニットテスト。 |
| IV. Firebase・セキュリティ | ✅ PASS | Firestore スキーマ拡張は後方互換。Security Rules 変更なし。 |
| V. 日本語コメント | ✅ PASS | 新規コードは日本語コメントで記述。 |

## Project Structure

### Documentation (this feature)

```text
specs/003-schedule-ui-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (impact areas)

```text
src/
├── app/(protected)/
│   ├── schedule/
│   │   └── page.tsx                         # 週開始曜日変更、マルチデイ修正
│   └── team/
│       └── page.tsx                         # 複数チーム表示・チーム参加・退出UI
├── components/
│   ├── calendar/
│   │   ├── WeekCalendar.tsx                 # 週開始曜日、マルチデイ、アイコン
│   │   ├── MonthCalendar.tsx                # 週開始曜日、マルチデイ
│   │   ├── ScheduleForm.tsx                 # 終日ボタン、2時間後デフォルト
│   │   └── ScheduleDetailModal.tsx          # 終日ボタン、マークダウンプレビュー
│   ├── ui/
│   │   ├── DateTimeInput.tsx                # [NEW] 統一日付+時間入力コンポーネント
│   │   └── MarkdownEditor.tsx               # [NEW] マークダウン入力＋プレビュートグル
│   ├── layout/
│   │   └── TeamSwitcher.tsx                 # [NEW] チームスイッチャードロップダウン
│   └── team/
│       └── JoinTeamForm.tsx                 # [NEW] チーム参加フォーム（既所属でも使用可）
├── lib/
│   ├── formDraft.ts                         # [NEW] localStorage ドラフト保存ユーティリティ
│   └── repositories/
│       └── teams.ts                         # switchActiveTeam・leaveSpecificTeam 追加
├── stores/
│   └── auth.ts                              # teamIds[] フィールド対応
└── types/
    └── entities.ts                          # ScheduleEntry.allDay?・User.teamIds[] 追加

functions/src/
├── teams/
│   ├── joinTeam.ts                          # 既存チーム削除ロジック除去
│   ├── createTeam.ts                        # 既存チーム削除ロジック除去
│   ├── leaveSpecificTeam.ts                 # [NEW] 特定チームから退出
│   └── switchActiveTeam.ts                  # [NEW] currentTeamId 更新のみ
└── auth/
    └── onUserCreate.ts                      # teamIds: [soloTeamId] で初期化
```

## Phase 0: Research

→ [research.md](research.md)

## Phase 1: Design Artifacts

### 1. 修正: マルチデイイベント表示

**問題**: `WeekCalendar.tsx` と `MonthCalendar.tsx` が `isSameDay(s.startAt, day)` で初日のみフィルタリング。

**解決策**:
```typescript
// 変更前
const dayEvents = schedules.filter(s => isSameDay(s.startAt, day))

// 変更後: 当日が startAt〜endAt の範囲内にあるすべてのイベントを表示
const dayEvents = schedules.filter(s => {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return s.startAt <= dayEnd && s.endAt >= dayStart
})
```

**WeekCalendarでの追加考慮**:
- マルチデイイベントは週ビューの上部に連続バーとして表示
- 「継続中」表示（前日からの継続 = 左端なし、翌日へ続く = 右端なし）のスタイル適用

### 2. 変更: 週開始曜日（日曜日）

**影響箇所**:
- `WeekCalendar.tsx:46` — `weekStartsOn: 1` → `weekStartsOn: 0`
- `MonthCalendar.tsx:60` — 同上
- `schedule/page.tsx:56` — 同上
- 曜日ヘッダー配列 `['月', '火', '水', '木', '金', '土', '日']` → `['日', '月', '火', '水', '木', '金', '土']`

### 3. 変更: マークダウン対応入力

**新コンポーネント `MarkdownEditor`**:
```typescript
interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  label?: string
  readOnly?: boolean
}
```

- 編集モード: 通常の `<textarea>`
- プレビューモード: `react-markdown` + `remark-gfm` でレンダリング
- トグルボタン（鉛筆/目のアイコン）で切替
- 追加依存: `react-markdown`, `remark-gfm`

**適用箇所**:
- `ScheduleForm.tsx` の description フィールド
- `ScheduleDetailModal.tsx` の description フィールドおよびコメント入力
- タスク詳細の description フィールド（`TaskDetailModal` があれば）

### 4. 変更: フォームドラフト保存

**設計方針**: `localStorage` を使用したシンプルなドラフト保存。モーダルを「確定」以外で閉じた際に保存し、次回開いた際に復元。

**`lib/formDraft.ts`**:
```typescript
export function saveDraft<T>(key: string, data: T): void
export function loadDraft<T>(key: string): T | null
export function clearDraft(key: string): void
```

**ドラフトキー例**:
- `draft:schedule:new` — 新規スケジュール作成フォーム
- `draft:schedule:{id}` — 既存スケジュール編集フォーム
- `draft:task:new` — 新規タスク作成フォーム

**動作**:
1. モーダルが「確定 (onSubmit)」以外で閉じられる → `saveDraft(key, formValues)`
2. モーダルが開かれる → `loadDraft(key)` で初期値を復元
3. 「確定」成功後 → `clearDraft(key)`

### 5. 追加: スケジュールカードにアイコン表示

**設計**:
- `ScheduleCategory` はすでに `icon: string` フィールドを持つ（Material Icons name）
- WeekCalendar の予定カードに `<span className="material-icons">` を追加
- カードの最小高さを調整（現行が低すぎる場合）

**カード高さ調整**:
- 現行: 高さを絞ったコンパクト表示
- 変更後: アイコン + タイトルが見えるだけの高さ（min-h-[40px] 程度）

### 6. 追加: 統一日付＋時間入力コンポーネント

**新コンポーネント `DateTimeInput`**:
```typescript
interface DateTimeInputProps {
  label: string
  value: Date | null
  onChange: (date: Date | null) => void
  min?: Date
  max?: Date
  required?: boolean
  error?: string
}
```

- 内部では `<input type="datetime-local">` を使用（既存と同じ技術）
- 共通のラベル・エラー表示スタイルを統一
- `Date ↔ string` 変換ロジックをカプセル化
- タイムゾーン考慮: ローカル時刻で入力/表示

**適用箇所**:
- `ScheduleForm.tsx` の startAt / endAt
- `ScheduleDetailModal.tsx` の startAt / endAt
- タスク詳細の期日入力（`TaskDetailModal` があれば）

### 7. 追加: 終日選択機能

**`ScheduleForm.tsx` / `ScheduleDetailModal.tsx` の変更**:

```
[ 開始日時  [input]  ] [ 終日 ] ← 新ボタン
[ 終了日時  [input]  ]
```

**「終日」ボタン動作**:
1. 開始日時が入力済みの場合: その日の 00:00 を startAt、23:59 を endAt にセット
2. 開始日時が未入力の場合: 本日の 00:00 / 23:59 をセット

**デフォルト「終了日時自動補完」**:
- startAt の `onChange` ハンドラー内で、endAt が未設定 or endAt < startAt の場合、endAt = startAt + 2時間 を自動セット
- 以降は独立して変更可能

**型拡張**:
```typescript
// types/entities.ts への追加
interface ScheduleEntry {
  // ...既存フィールド
  allDay?: boolean  // 終日フラグ（後方互換のため optional）
}
```

### 8. 追加: 複数チーム同時所属＋チームスイッチャー

#### アーキテクチャ変更の方針

「**アクティブチーム切替パターン**」を維持しながら複数所属を実現する。全リポジトリ・ストア・ページコンポーネントは変更不要。変更範囲は Cloud Functions と UI のみ。

#### データモデル変更

```typescript
// types/entities.ts
interface User {
  // 既存フィールド（変更なし）
  currentTeamId: string | null   // 現在表示中のアクティブチーム
  // 追加
  teamIds: string[]              // 所属している全チームIDリスト
}
```

#### Cloud Functions 変更

| 関数 | 変更内容 |
|------|---------|
| `joinTeam.ts` | `tx.delete(oldTeam/members/uid)` を削除。`teamIds` 配列への追加に変更 |
| `createTeam.ts` | 同上 |
| `onUserCreate.ts` | `teamIds: [soloTeamId]` で初期化 |
| `leaveSpecificTeam.ts` (新規) | 指定チームの `members/{uid}` を削除。`teamIds` から除外。最後のチームの場合は solo チームを自動生成 |
| `switchActiveTeam.ts` (新規) | `users/{uid}.currentTeamId` を更新するだけの軽量関数 |

#### Auth Store 変更

```typescript
// stores/auth.ts に teamIds 追加
interface AuthState {
  teamIds: string[]    // 追加: 全所属チームIDリスト
  // ...既存フィールドは変更なし
}
```

Firestore `users/{uid}` の `teamIds` フィールドを `onSnapshot` で購読して同期。

#### UI: チームスイッチャー

**`components/layout/TeamSwitcher.tsx`** (新規):
- Sidebar の上部またはヘッダーに配置
- 現在のアクティブチーム名を表示
- ドロップダウンで全所属チームを一覧表示
- 選択すると `switchActiveTeam(teamId)` を呼び出し

**`app/(protected)/team/page.tsx`** の変更:
- 所属チーム一覧セクション（チームカード形式）
- 各チームカードに「アクティブにする」「退出する」ボタン
- 「別のチームに参加する」フォーム（既所属ユーザーでも利用可能）
- チームコード入力 → `joinTeam({ teamCode })` 呼び出し（退出なし）

#### 既存ユーザーのマイグレーション

`onUserCreate` は新規ユーザーのみ対象。既存ユーザーの `teamIds` は `switchActiveTeam` / `leaveSpecificTeam` の Cloud Function 実行時に `teamIds` が未設定（undefined / 空配列）であれば `currentTeamId` を元に自動補完する。

## Complexity Tracking

| 変更 | 理由 | シンプルな代替が不十分な理由 |
|------|------|----------------------------|
| react-markdown 追加 | マークダウンのパース・レンダリングに必要 | 独自実装はセキュリティリスク (XSS) が高く保守困難 |
| localStorage ドラフト保存 | フォーム入力の永続化 | Zustand は画面リロードで失われる |
| User.teamIds[] 追加 | 複数チーム所属の追跡に必要 | `currentTeamId` 単体では過去の所属履歴を保持できない |
| Cloud Functions 修正 (joinTeam / createTeam) | 既存の「旧チーム削除」ロジックを除去する必要がある | クライアントサイドで直接 Firestore を書き換えると Security Rules を変更しなければならない |
