# Implementation Plan: コラボ調整画面 UI リデザイン

**Branch**: `006-collab-ui-redesign` | **Date**: 2026-05-20 | **Spec**: [spec.md](./spec.md)  
**Input**: `specs/006-collab-ui-redesign/spec.md`

## Summary

コラボ調整ページのレイアウト変更・確定コラボセクション追加・CollabDetailModal リサイズバグ修正・CollabResponseForm の 3 ステップ UI 化を行う。新規 Cloud Function は不要で既存 `reopenCollabSession` を再利用する。

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 14 App Router  
**Primary Dependencies**: React 18, Tailwind CSS 4, date-fns, Firebase SDK  
**Storage**: Firestore（変更なし）  
**Testing**: Vitest（ユニット）/ Playwright（E2E）— UIコンポーネント変更のためテスト追加は任意  
**Target Platform**: Web（PC + Mobile 375px+）  
**Project Type**: Web application  
**Performance Goals**: N/A（静的レイアウト変更のみ）  
**Constraints**: モバイル 375px でスクロールなし表示  
**Scale/Scope**: 2 ファイル変更（collabs/page.tsx、CollabDetailModal.tsx）、1 ファイル再設計（CollabResponseForm.tsx）

## Constitution Check

| 原則 | 判定 | 備考 |
|------|------|------|
| I. シンプルさ優先 | ✅ | 新抽象化なし。既存コンポーネントを直接変更 |
| II. TypeScript型安全 | ✅ | any 禁止。既存型を再利用 |
| III. テスト方針 | ✅ | UI変更のためテスト任意。ビジネスロジック変更なし |
| IV. Firebase・セキュリティ | ✅ | リポジトリ関数経由のみ。新規 Cloud Function なし |
| V. 日本語コメント | ✅ | 全コメントを日本語で記述 |

## Project Structure

### Documentation (this feature)

```text
specs/006-collab-ui-redesign/
├── spec.md       ✅
├── research.md   ✅
├── plan.md       ← このファイル
└── tasks.md      （/speckit-tasks で生成）
```

### Source Code

```text
src/
├── app/(protected)/collabs/
│   └── page.tsx                    # レイアウト変更・確定セクション追加・件数移動
├── components/collab/
│   ├── CollabDetailModal.tsx       # リサイズバグ修正
│   └── CollabResponseForm.tsx      # 3ステップ UI 再設計
```

## Implementation Phases

### Phase A: ページレイアウト変更（collabs/page.tsx）

1. TopBar の `subtitle` prop を削除（受信/送信件数をヘッダーから除去）
2. 「受信・送信したコラボ調整」見出し横に件数バッジを追加
3. 中央カラムに「予定確定したコラボ」セクションを追加（confirmed セッションリスト）
4. 各確定カードに確定日時・タイトル・「再調整する」ボタンを表示
5. 「再調整する」クリック時にインライン確認 UI を表示し `reopenCollabSession` を呼ぶ

### Phase B: モーダルバグ修正（CollabDetailModal.tsx）

1. `mouseDownOnOverlay` ref を追加
2. オーバーレイ div の `onMouseDown` で ref をセット
3. オーバーレイ div の `onClick` を ref チェックに変更

### Phase C: 送信フォーム 3 ステップ化（CollabResponseForm.tsx）

1. `currentStep` state を追加（0: 名前、1: 日程、2: コメント）
2. 「○○さんからの」テキストを削除
3. Step1: 名前入力（説明文 + メンバーアイコン選択 or テキスト入力+追加）
4. Step2: 候補日程回答・別の日程提案（説明文付き）
5. Step3: コメント入力（説明文付き）
6. PC（md: 768px+）: `md:grid md:grid-cols-3 md:gap-6` で横並び（全ステップ常時表示）
7. モバイル: step ナビゲーション（← 前へ / 次へ →）
8. 完了画面に「このページを再度開くと回答を修正できます」アナウンス追加

## Complexity Tracking

追加複雑性なし。全て既存パターンの範囲内。
