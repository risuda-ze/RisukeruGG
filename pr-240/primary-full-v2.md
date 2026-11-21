# PR 240 一次レビュー（scope=full, HEAD e6c5cf86e4e27f4de30c9040e8bb01cb544ec3e5）

## 判定
合格（要修正 0 件）。前回の確認漏れ（実機・E2E・スクリーンショット・pnpm verify）を実施して埋めた。

## 実施した確認
- pnpm verify（lint + typecheck + functions build + vitest）: EXIT 0。36 files / 279 tests pass。
- Emulator（pnpm emulators）+ dev サーバー（Emulator 接続）+ seed で起動。pnpm exec playwright test --project=emulator tests/e2e/theme-toggle.spec.ts: 1 passed（リロード維持・localStorage 削除後の Firestore 復元・system の emulateMedia 追従）。
- 実操作（Playwright 一時スクリプト、確認後に削除）: コンソールエラー・4xx/5xx は PR 版で 0 件、develop でも 0 件（回帰なし）。
- 定例チェック: 抑制コメント・TODO・sleep/retry/skip の追加なし、例外握りつぶしなし（updateDoc 失敗は toast.error）。dataset.theme の直接参照は globals.css のみ。正本仕様（ui/*, user/model）同期済み。

## テストケース表
| ID | 受入条件 | 入力 → 期待 | 分類 | 結果 |
|----|---------|------------|------|------|
| T1 | UI-035 巡回順 | dark→light→system→dark | 自動(theme.test.ts) | OK |
| T2 | UI-037 不正値 | 3 値以外は null | 自動 | OK |
| T3 | UI-034/036 | ライト選択→リロードで維持 | E2E 実行 | OK |
| T4 | UI-037 | localStorage 削除→リロードでも Firestore から light 復元 | E2E 実行 | OK |
| T5 | UI-033 | system で emulateMedia 追従 | E2E 実行 | OK |
| T6 | UI-036 | users/{uid} を削除して updateDoc を失敗させ押下 → 表示は切り替わり toast「テーマの保存に失敗しました」 | 実操作 | OK（after-save-failure-toast.png） |
| T7 | UI-037 | 同一ブラウザの別タブでライト→端末に合わせる 変更が別タブへ反映 | 実操作 | OK |
| T8 | UI-035 | 折りたたみ時はアイコンのみ（text 空）で aria-label に現在の選択。モバイル「その他」ドロワー最下部に表示 | 実操作 | OK（after-desktop-collapsed.png, after-mobile-drawer.png） |
| T9 | UI-038 | themeColor/manifest 変更なし | 差分確認 | OK |
| R1確認 | 連打 | 後述 | 実操作 | 再現せず |

## 指摘一覧
要修正: なし。推奨・要確認: なし。

### 前回 R1（ThemeProvider.tsx:13-15 連打時の一時的な light 戻り）の事実確認
単一タブで 3 連打（system→dark→light→system）を 22 回実施し、UI・html[data-theme]・localStorage・Firestore の値がすべて期待と一致、途中の戻りも観測されなかった。事実として確認できないため指摘しない。
（参考: 別タブを開いた直後 1 秒未満にもう一方のタブで操作する、という操作では 4 回中 1 回、タブ間の localStorage と購読の到着順で表示が一時的に不一致になった。人手で再現する操作ではなく、仕様上も未定義の範囲のため指摘としない。）

## スクリーンショット（review-artifacts/pr-240/）
- 変更前（develop e30f939）: before-desktop-dark.png, before-mobile.png
- 変更後: after-desktop-dark.png, after-desktop-light.png, after-desktop-collapsed.png, after-mobile.png, after-mobile-drawer.png, after-save-failure-toast.png

## 未実施
- 実ブラウザでの OS のカラースキーム切り替え（emulateMedia で代替）、実機 iOS/Android、本番 Firebase。
