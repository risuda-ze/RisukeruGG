# Implementation Plan: コラボ調整機能 UI リデザイン

**Branch**: `015-collab-ui-redesign` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-collab-ui-redesign/spec.md`
**Design Source**: `specs/015-collab-ui-redesign/design/gg-readme/project/コラボ.html`

---

## Summary

コラボ調整機能の一覧画面・詳細ポップアップをデザインファイル（`コラボ.html`）に完全準拠して再実装する。横長行カード（`.cbrow`）による2ゾーン構成の一覧、左右分割詳細フォーム（左: 入力、右: `.tchat` チャット欄）、カード型候補日時エディタ（○△× ホバーツールチップ）、FPS テーマ（`.cb--fps`）、モバイルレスポンシブ（ゾーン切替ピル + コンパクトカード）を実装する。既存の `CollabDetailModal.tsx` と `CollabForm.tsx` を統合・置き換える。

---

## Technical Context

**Language/Version**: TypeScript 5 (strict: true), Node.js 22
**Primary Dependencies**: Next.js 14 (App Router), Tailwind CSS v4, Zustand, Firebase Firestore
**Storage**: Firebase Firestore（`teams/{teamId}/collabSessions`）
**Testing**: Vitest（ユニット）、Playwright（E2E）
**Target Platform**: Web（PC 1440px / モバイル 390px）
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: ページ遷移 < 200ms（現状維持）
**Constraints**: Material Icons はグローバルロード済み。CSS は既存 `globals.css` トークンを使用
**Scale/Scope**: 1チーム最大50コラボ程度

---

## Constitution Check

| 原則 | 確認 | 備考 |
|---|---|---|
| I. シンプルさ優先 | ✅ | `CollabForm.tsx` を廃止し `CollabDetailModal.tsx` に統合。新抽象化なし |
| II. TypeScript型安全 | ✅ | `CollabStatus` に `draft` 追加。`participantResponses` の値型拡張。`any` 不使用 |
| III. テスト方針 | ✅ | コラボ日程調整ロジック（Constitution III 必須）E2E テスト追加。UI コンポーネント単体テストは任意 |
| IV. Firebase・セキュリティ | ✅ | 既存リポジトリパターン踏襲。`updatedBy`/`updatedAt` は型付き関数経由で書き込み |
| V. 日本語コメント | ✅ | 全コメント日本語で記述 |

**Complexity Tracking**: 違反なし。

---

## Project Structure

### Documentation (this feature)

```text
specs/015-collab-ui-redesign/
├── plan.md                    # This file
├── spec.md                    # Feature specification
├── research.md                # Phase 0 (デザインファイル調査・技術決定)
├── data-model.md              # Phase 1 (データモデル変更)
├── quickstart.md              # Phase 1 (開発起動手順)
├── contracts/
│   └── ui-contracts.md        # UI コンポーネント契約（デザイン準拠）
├── design/gg-readme/          # ダウンロード済みデザインファイル
│   ├── README.md
│   ├── chats/chat1.md〜chat8.md
│   └── project/
│       ├── コラボ.html
│       ├── collab-pc.jsx
│       ├── collab-mobile.jsx
│       ├── collab-data.jsx
│       ├── collab.css
│       └── components.jsx
└── tasks.md                   # Phase 2 (/speckit-tasks コマンド出力)
```

### Source Code（変更対象）

```text
src/
├── types/
│   └── entities.ts                        # CollabStatus に draft 追加、ラベル更新、updatedBy/updatedAt 追加
├── lib/repositories/
│   └── collabs.ts                         # draft 対応、updatedBy/updatedAt 自動セット
├── app/(protected)/collabs/
│   └── page.tsx                           # 全面リデザイン（2ゾーン一覧 + モバイルレスポンシブ）
└── components/collab/
    ├── CollabDetailModal.tsx              # 全面リデザイン（左右分割・候補日カード・コメント欄）
    ├── CollabForm.tsx                     # 削除（CollabDetailModal.tsx に統合）
    └── CollabResponseForm.tsx             # コメント保存処理を確認・必要に応じて更新

tests/e2e/collabs/
└── collab-ui-redesign.spec.ts            # E2E テスト（新規）
```

**Structure Decision**: 既存 App Router 構造に従う。新規ファイルは E2E テストのみ。`CollabForm.tsx` 廃止でファイル数を減らす。

---

## Sprint Plan

### Sprint 1: データモデル更新 + コラボ一覧画面リデザイン

**目標**: データモデルを更新し、コラボ一覧画面（`page.tsx`）をデザイン準拠の新UIに置き換える

**実装ファイル**:

1. **`src/types/entities.ts`**
   - `CollabStatus` に `'draft'` 追加
   - `COLLAB_STATUS_LABELS` 更新（`draft→準備中`, `open→募集中`, `confirmed→確定`）
   - `CollabSession` に `updatedBy?: string`, `updatedAt?: Date` 追加
   - `participantResponses` 値型に `'maybe'` 追加

2. **`src/lib/repositories/collabs.ts`**
   - `createCollabSession()` の `status` デフォルトを `'draft'` に対応
   - `updateCollabSession()` で `updatedBy: currentUser.uid` / `updatedAt: new Date()` を自動セット
   - Firestore の `toCollabSession()` で `updatedBy`, `updatedAt`, `'maybe'` を読み取り

3. **`src/app/(protected)/collabs/page.tsx`**（全面書き換え）
   - FPS テーマ `.cb--fps` クラス適用
   - `CollabBadge` コンポーネント: ステータスバッジ（`cbbadge cbbadge--{status}`、draft→prep/open→recruit/confirmed→fixed のクラスマッピング）
   - `PartyAvatars` コンポーネント: 参加者アバター重ね（`.cbava`、最大4件+N）
   - `CollabRow` コンポーネント: 横長行カード（`.cbrow`）
   - `CollabZone` コンポーネント: ゾーンセクション（`.cbzone`）
   - `CollabBoard` コンポーネント: コントロールバー（追加ボタン + ? アイコン + ヒントパネル） + 2ゾーン。バナー（`.cbbanner`）は不使用
   - モバイル（`useMediaQuery`または画面幅検知）: `MCollabCard`（`.mcbcard`）+ ゾーン切替ピル（`.mtpills`）。モバイル下部固定ボタンは不使用（コントロールバーに統合）

**受け入れ基準 (SC)**:
- SC-001: 2ゾーンにコラボが正しく振り分けられる（draft+open → 調整中、confirmed → 予定確定）
- SC-002: 横長カードに全要素が表示される（タイトル・バッジ・アバター・回答状況・ボタン）
- SC-003: コントロールバーに「コラボ調整開始」ボタンと「?」アイコンが表示される（バナーではなくシンプルなコントロールバー形式）
- SC-004: モバイル幅（390px）でコンパクトカード + ゾーン切替ピルが表示される
- SC-005: 型チェック・Lint がパスする

---

### Sprint 2: コラボ詳細ポップアップ リデザイン

**目標**: `CollabDetailModal.tsx` を左右分割レイアウトに全面置き換え。`CollabForm.tsx` を廃止

**実装ファイル**:

1. **`src/components/collab/CollabDetailModal.tsx`**（全面書き換え）
   - モーダル骨格: `.smodal > .smodal__card.smodal__card--collab`（width: 1020px）
   - ヘッダー: `.smodal__hd`（タイトル + 閉じるボタン）
   - モーダルレイアウト: モバイルはボトムシート（オーバーレイ `items-end`・`collab-modal` CSS クラス）、PC はセンター配置（`md:items-center`）。モバイルではドラッグ無効
   - `md:` (768px) ブレークポイントで左右2カラム切り替え
   - 左ペイン（`flex-1 overflow-y-auto`）:
     - タイトル入力（必須、isOpen時のみ編集可）
     - 内容テキストエリア
     - `CandidateEditor` コンポーネント（候補日カード型、必須: 1件以上）
     - `ParticipantEditor` コンポーネント（プルダウン+テキスト入力、必須: 1人以上）
   - 右ペイン（PC: `md:w-[320px]` 固定 / モバイル: `max-h-[280px]` 縦積み）:
     - コメント/メモ欄（アバター + 名前 + バブル + 日時）
   - フッターボタン（左→右）: 削除（編集時のみ・`mr-auto`）｜ URLをコピー ｜ 調整を確定（open時・候補日選択必須）｜ 保存（open時・常時有効）
   - `CandidateEditor`: 候補日カードリスト + インライン追加フォーム + 「候補日時を追加」ボタン
   - `CandidateEditor`: `○N △M ×K` 表示 + ホバーツールチップ（参加者アバター+名前）
   - `ParticipantEditor`: チームメンバープルダウン + ゲスト名入力 + `.cbchip` リスト
   - バリデーション: 必須項目チェック（保存時）

2. **`src/components/collab/CollabForm.tsx`**
   - 削除

3. **`src/app/(protected)/collabs/page.tsx`**
   - 「コラボ調整開始」ボタン → `CollabDetailModal` を新規モード（`session=null`）で開く
   - 「詳細」ボタン → `CollabDetailModal` を編集モード（`session=...`）で開く

**受け入れ基準 (SC)**:
- SC-006: 新規モード: ステータス初期値=準備中、削除ボタン非表示
- SC-007: 必須項目未入力で保存するとバリデーションエラー表示
- SC-008: 候補日カードに `○N △M ×K` が表示され、数字ホバーで参加者名が表示される
- SC-009: コメントを投稿すると右ペインに表示される
- SC-010: モバイル幅で詳細フォームがボトムシートレイアウト（下部から出現）＋縦1カラムになる
- SC-011: 型チェック・Lint がパスする

---

### Sprint 3: コラボ回答フォーム + E2E テスト

**目標**: 回答フォームのコメントを詳細ポップアップに反映し、E2E テストを整備

**実装ファイル**:

1. **`src/components/collab/CollabResponseForm.tsx`**
   - 回答コメントを `CollabComment` 型として Firestore に書き込む処理を確認・実装
   - アイコンは既定の単色アバター（`avatarStyle(name)` 相当）を使用

2. **`tests/e2e/collabs/collab-ui-redesign.spec.ts`**
   - 一覧画面: 2ゾーン表示・コラボカード要素確認
   - 新規作成フロー: バリデーション確認 + 保存 + 一覧反映
   - ステータス変更によるゾーン移動
   - コメント投稿 → 右ペイン表示確認
   - モバイルビューポートでのレスポンシブ確認

**受け入れ基準 (SC)**:
- SC-012: 回答フォームのコメントが詳細ポップアップ右ペインに表示される（既定単色アイコン・回答者名）
- SC-013: E2E テスト全件パス
- SC-014: 全幅（PC/モバイル）でレスポンシブ正常動作

---

## デザイン実装ノート（Generator 向け）

### CSS クラスマッピング（デザインファイル → globals.css トークン）

| デザイン変数 | globals.css 変数 |
|-------------|-----------------|
| `--cb-accent` | `#3fb6e0`（FPS テーマで `.cb--fps` に定義 → `globals.css` の `--primary` と同値） |
| `--text-primary`, `--text-secondary`, `--text-muted` | `--text`, `--text-2`, `--muted` |
| `--card`, `--surface`, `--card-raised` | `--card`, `--surface`, `--card-2` |
| `--card-border`, `--card-border-raised` | `--border`, `--border-l` |

### collab.css の組み込み方針

- `globals.css` に `.cb--fps` と全 `.cb*` クラスを追記する
- または `src/app/(protected)/collabs/collab.css` として別ファイルで管理して page.tsx で `import './collab.css'`
- **推奨**: Tailwind CSS v4 プロジェクトなので、コアのトークンは `@theme` / CSS 変数を使いつつ、複雑なレイアウトは `collab.css` として管理する

### ステータス値のマッピング（CSS クラス用）

| CollabStatus 値 | CSS クラスサフィックス |
|----------------|----------------------|
| `draft` | `prep` |
| `open` | `recruit` |
| `confirmed` | `fixed` |

```tsx
const STATUS_CLASS: Record<CollabStatus, string> = {
  draft:     'prep',
  open:      'recruit',
  confirmed: 'fixed',
  expired:   'prep',
  cancelled: 'prep',
};
// 使用例: <span className={`cbbadge cbbadge--${STATUS_CLASS[session.status]}`}>
```
