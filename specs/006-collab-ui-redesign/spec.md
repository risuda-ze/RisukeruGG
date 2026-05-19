# Feature Specification: コラボ調整画面 UI リデザイン

**Feature Branch**: `006-collab-ui-redesign`
**Created**: 2026-05-20
**Status**: Draft
**Scope**: コラボ調整画面の配置変更・確定カード・送信フォーム 3 ステップ化・バグ修正

---

## User Scenarios & Testing

### User Story 1 - 受信・送信件数をセクション見出しへ移動 (Priority: P1)

ヘッダーバーに表示されていた「受信 ○ 件・送信 ○ 件」テキストを、画面中央の「受信・送信したコラボ調整」セクション見出しの横に移動する。

**Acceptance Scenarios**:

1. **Given** コラボ調整ページを開く、**When** TopBarを確認、**Then** 件数表示はない
2. **Given** コラボ調整ページを開く、**When** 中央セクション見出しを確認、**Then** 「受信・送信したコラボ調整　受信 2 件・送信 1 件」のように件数が見出し横に表示される

---

### User Story 2 - 画面中央に 2 セクション配置 (Priority: P1)

画面レイアウトを変更し、中央エリアに「受信・送信したコラボ調整カードリスト」と「予定確定したコラボカードリスト」を縦に並べる。右サイドバーには新規作成フォームを残す。

**Acceptance Scenarios**:

1. **Given** open ステータスのコラボが存在する、**When** 中央を確認、**Then** 「受信・送信したコラボ調整」セクションにカードが表示される
2. **Given** confirmed ステータスのコラボが存在する、**When** 中央を確認、**Then** 「予定確定したコラボ」セクションにカードが表示される
3. **Given** 両セクションが表示されている、**When** 新規作成フォームを確認、**Then** 右サイドバーに表示される

---

### User Story 3 - 予定確定コラボカードに「再調整」ボタン (Priority: P1)

予定確定したコラボカードには確定日時と「再調整する」ボタンを表示し、クリックで open ステータスに戻す。再調整時は紐づくスケジュールが削除される（Cloud Function 既実装）。

**Acceptance Scenarios**:

1. **Given** confirmed コラボカードが表示されている、**When** 「再調整する」をクリック、**Then** 確認ダイアログが表示される
2. **Given** 確認ダイアログで承認、**When** 実行後、**Then** カードは「受信・送信したコラボ調整」セクションに移動し、スケジュールが削除される
3. **Given** 確認ダイアログでキャンセル、**When** 確認、**Then** 状態は変化しない

---

### User Story 4 - CollabDetailModal リサイズ時クローズバグ修正 (Priority: P1)

モーダルを `resize: both` でリサイズドラッグすると、マウスリリース位置がオーバーレイ上になり `onClose` が誤発火する問題を修正する。

**Root Cause**: オーバーレイに `onClick={onClose}` を設定しているが、ドラッグ操作では mousedown がモーダル内で起きても mouseup がオーバーレイで起きると click イベントがオーバーレイに発火する。

**Fix**: `mousedown` イベントの発生ターゲットを追跡し、モーダル内で mousedown が始まった場合はオーバーレイの click を無視する。

**Acceptance Scenarios**:

1. **Given** モーダルを開く、**When** 右下のリサイズハンドルをドラッグして大きくする、**Then** モーダルが閉じない
2. **Given** モーダルを開く、**When** オーバーレイ（背景暗部）をクリック、**Then** モーダルが閉じる

---

### User Story 5 - CollabResponseForm を 3 ステップ構成に変更 (Priority: P1)

公開コラボ送信フォームを以下の 3 ステップに再構成する。

- **Step 1**: 名前入力（チームメンバーはアイコン選択、それ以外は名前入力+追加ボタン）
- **Step 2**: 候補日程への回答・別の日程を提案
- **Step 3**: コメント（任意）

**PC（768px 以上）では 3 ステップを横並びで表示**し、左から右へ流れるデザインとする。各ステップには説明文を記述して迷わないようにする。「○○さんからの」テキストは削除する。回答完了後の画面で「回答内容を修正する場合は再度このページを開いてください」などのアナウンスを表示する。

**Acceptance Scenarios**:

1. **Given** 公開コラボページをモバイルで開く、**When** 表示を確認、**Then** Step1→Step2→Step3 が縦積みで表示される
2. **Given** 公開コラボページを PC で開く、**When** 表示を確認、**Then** Step1・Step2・Step3 が横並びで表示される
3. **Given** Step1 でメンバーアイコンをクリック、**When** 確認、**Then** その名前が選択されてStep2に進める
4. **Given** Step1 で名前を直接入力して追加ボタンを押す、**When** 確認、**Then** 名前が設定される
5. **Given** 全ステップ入力済みで送信する、**When** 送信成功後、**Then** 完了画面に「回答の修正方法」のアナウンスが表示される
6. **Given** 完了画面を確認、**When** テキストを読む、**Then**「このページを再度開くと回答を修正できます」旨のメッセージが表示される
7. **Given** ページ内に「○○さんからの」テキストが存在しない、**When** 確認、**Then** 表示されていない

---

## Requirements

### Functional Requirements

- **FR-001**: TopBar の `subtitle` プロパティから件数テキストを削除する
- **FR-002**: 「受信・送信したコラボ調整」見出し横に受信/送信件数を表示する
- **FR-003**: `collabs/page.tsx` の中央カラムに open セッションと confirmed セッションの両セクションを縦配置する
- **FR-004**: 予定確定セクションの各カードに「再調整する」ボタンを表示する
- **FR-005**: 「再調整する」クリック時に確認ダイアログを出し、承認で `reopenCollabSession` を呼ぶ
- **FR-006**: CollabDetailModal のオーバーレイ onClick 誤発火を、mousedown ターゲット追跡で修正する
- **FR-007**: CollabResponseForm から「○○さんからの」テキストを削除する
- **FR-008**: CollabResponseForm を Step1（名前）・Step2（日程回答）・Step3（コメント）の 3 ステップ UI に変更する
- **FR-009**: PC（md: 768px 以上）では 3 カラム横並びレイアウトを使用する
- **FR-010**: 各ステップに説明文を記載する
- **FR-011**: 回答完了後の画面に修正方法アナウンスを表示する

### Non-Functional Requirements

- **NFR-001**: TypeScript strict モード準拠、`any` 禁止
- **NFR-002**: コードコメントは日本語
- **NFR-003**: モバイル（375px）でスクロールなしに 3 ステップが表示できること

### Key Entities（変更なし）

- `CollabSession`: `status`、`confirmedDate`、`linkedScheduleId` — 再調整は Cloud Function 既実装
- スケジュール連動は `reopenCollabSession` Cloud Function が担当（削除済み実装）

## Out of Scope

- 新しい Cloud Function の追加（再調整は既存の `reopenCollabSession` を再利用）
- Firestore スキーマ変更
- テストの追加（UIコンポーネント変更のため Constitution III に従い任意）

## Success Criteria

- **SC-001**: ヘッダーに件数が表示されず、セクション見出し横に表示される
- **SC-002**: 中央に確定コラボセクションが表示され「再調整する」が機能する
- **SC-003**: モーダルのリサイズドラッグでモーダルが閉じない
- **SC-004**: 公開フォームが 3 ステップで表示され PC では横並びになる
- **SC-005**: 完了後に修正方法アナウンスが表示される
