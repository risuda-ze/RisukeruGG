# PR 240 一次レビュー（scope=full, HEAD e6c5cf86e4e27f4de30c9040e8bb01cb544ec3e5）

## 判定
合格（要修正 0 件）。ただしアプリ実機・E2E は未実施（下記）。

## 定例チェック
- 実装負債基準: 該当なし。抑制コメント・TODO・sleep/retry/skip の追加なし、例外握りつぶしなし（updateDoc 失敗は toast.error で可視化 = UI-036）。
- 他の呼び出し元: dataset.theme / data-theme の直接参照は globals.css（既存）のみ。DesignGallery は useTheme へ置換済み。users/{uid} 購読は auth.ts 1 か所で theme を追加。Sidebar/MobileToolbar は AppShell のみ配置（保護ルート内）。TeamSwitcher は AccountMenu にもあるが ThemeToggle は仕様どおり Sidebar/ドロワーのみ。
- 正本同期: ui/README, flows, model, requirements(UI-033〜038), user/model を更新済み。「未実装」注記の残りなし（grep 0 件）。firestore.rules は affectedKeys が plan 系のみ拒否のため theme 更新可（仮決定 7 と一致）。
- CI 相当: pnpm typecheck OK / pnpm lint 0 error（10 warning は変更外ファイルの既存）/ vitest 全体 36 files 279 tests pass（theme 3 件含む）。pnpm verify 全体と functions build は未実行。next-themes 0.4.6 は peer が React 19 を許容、lock 整合。
- 動作確認: 未実施。理由: Emulator/dev サーバー起動と Playwright 操作を本サブタスクで行っていない（run-and-debug の dev-up を実行せず）。スクリーンショット未取得。

## テストケース表
| ID | 受入条件 | 技法 | 入力 → 期待 | 分類 | 結果 |
|----|---------|------|------------|------|------|
| T1 | UI-035 巡回順 | 状態遷移 | dark→light→system→dark | 自動(theme.test.ts) | OK |
| T2 | 仮決定7 / UI-037 | 同値分割・エラー推測 | 3 値は返す。undefined/null/''/'Dark'/'blue'/1/{} は null | 自動 | OK |
| T3 | UI-034/036 | E2E | ライトにしリロード後も data-theme=light | 既存E2E(theme-toggle.spec, emulator) | 未実施 |
| T4 | UI-037 | E2E | localStorage 削除後リロードでも Firestore から light 復元 | 既存E2E | 未実施 |
| T5 | UI-033 | E2E | system で emulateMedia 追従 | 既存E2E | 未実施 |
| T6 | UI-036 | 手動 | updateDoc 失敗時に表示は維持し toast | 手動確認要 | 未実施 |
| T7 | UI-037 他端末同期 | 手動 | 別タブ/端末で変更→購読で反映 | 手動確認要 | 未実施 |
| T8 | UI-035 折りたたみ/ドロワー | 手動 | 折りたたみでアイコンのみ+aria-label、モバイルドロワー最下部に表示 | 手動確認要 | 未実施 |
| T9 | UI-038 | コード確認 | themeColor/manifest 変更なし | 差分確認 | OK |

追加テストファイル: なし（PR 側の tests/unit/theme/theme.test.ts, tests/e2e/theme-toggle.spec.ts を確認）。

## 指摘一覧
要修正: なし。

| ID | 重大度 | 該当箇所 | 再現条件 | 期待 | 実際 |
|----|--------|----------|----------|------|------|
| R1 | 要確認（推奨・要修正ではない） | src/components/ThemeProvider.tsx:13-15 | ログイン中に ダーク→ライト→端末 を素早く連打し、最初の書き込みのローカル snapshot が 2 回目押下後に届く | 最終的に最後の選択になる | 途中で一瞬 light に戻る可能性（最終的には system の snapshot で収束）。実機未確認の推測 |
| R2 | 要確認 | tests/e2e/theme-toggle.spec.ts | emulator 実行 | 通過 | 本レビューでは未実行。末尾で toggle('端末に合わせる') → 'ダーク' に戻す後始末はあるが、途中失敗するとシード状態が残る（テスト隔離の注意のみ） |

## 手動確認要の項目
1. ログイン → サイドバー最下部（TeamSwitcher 直上）で押すたびに ダーク→ライト→端末に合わせる。リロードで維持、ちらつきなし。
2. サイドバー折りたたみ時にアイコンのみ・aria-label に現在の選択。
3. モバイル幅の「その他」ドロワー最下部に表示、操作できる（min-h-11）。
4. Firestore を拒否にした状態（またはオフライン不可状態）で押下 → 表示は切り替わり toast「テーマの保存に失敗しました」。
5. 別タブで変更 → 他タブへ即時反映。コンソールの hydration 警告なし。
6. /design-preview のダーク/ライトボタンが動く。
