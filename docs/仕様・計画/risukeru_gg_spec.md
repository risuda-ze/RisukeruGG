# RisukeruGG

**最終更新**: 2026-05-26
**バージョン**: 1.0.0

---

## ユビキタス言語

共通用語は [docs/共通用語/共通用語.md](../共通用語/共通用語.md) を参照してください。

> 注記: 用語の追加・定義更新が必要な場合は、この仕様書ではなく共通用語ファイル側を更新してください。

---

## 概要

ゲーム配信者（Twitch・YouTube）およびその制作チームを対象とした、配信者特化型チームスケジュール管理 Web アプリ。配信枠の共有管理・コラボ日程調整・制作タスク管理を一元化し、配信者が本業（配信）に集中できる環境を提供する。

**技術スタック**: Next.js 14（App Router）/ TypeScript / Tailwind CSS / Zustand / Firebase（Auth・Firestore・Storage・Cloud Functions・FCM）/ Vercel / pnpm / ESLint+Prettier / Vitest / Playwright

---

## 機能要件

この章は、プロジェクト全体の機能分類・責務・参照先をまとめる親仕様です。

詳細仕様は [docs/仕様・計画](./) 配下のカテゴリ別ディレクトリに分割し、親仕様には全体像と参照のみを保持します。

> 注記: 新規要件の追加や既存要件の更新は、まず該当カテゴリ配下の詳細ファイルを更新し、その後にこの章の全体像を必要な範囲で同期してください。

### 配置ルール

- 機能カテゴリごとに [docs/仕様・計画](./) 配下へ機能IDディレクトリを作成する
- 各機能ID配下では `README.md` を入口とし、`requirements.md`、`model.md`、`flows.md` を基本構成とする
- 画面仕様、権限仕様、外部連携仕様などが必要になった場合は、該当カテゴリ配下へ追加ファイルを拡張する

### 要件ID採番ルール（2026-05 更新）

- 機能要件IDは `FR-***` ではなく、`{機能識別ID}-{番号}` 形式で管理する
- 機能識別IDは以下を使用する
  - `user`: `US`
  - `team`: `TE`
  - `task`: `TA`
  - `schedule`: `SC`
  - `plan`: `PL`
  - `platform`: `PF`
  - `collab`: `CO`
  - `notification`: `NO`
  - `ui`: `UI`
  - `integration`: `IN`
  - `ai`: `AI`
  - `production`: `PD`
  - `unavailability`: `UN`
- 番号は 3 桁ゼロ埋めを基本とし、各機能カテゴリごとに必ず `001` から開始する（例: `TE-001`）
- 同一機能内で要件を細分化する場合は枝番を付与する（例: `TE-010-1`, `SC-008-2`）
- 新規要件追加時は同一カテゴリ内で末尾に連番を採番し、他カテゴリの番号は参照しない。既存IDの再利用はしない

### カテゴリ一覧

| 機能ID         | カテゴリ             | 大まかな記述内容                                                                                           | 参照先                                                                                                                    |
| -------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `user`         | 認証・アカウント管理 | Google OAuth2 認証、初回ログイン時のアカウント初期化、セッション維持、アカウント削除後のゴースト保持を扱う | [README](./user/README.md) / [requirements](./user/requirements.md) / [model](./user/model.md) / [flows](./user/flows.md) |
| `plan`         | プラン管理           | LIGHT / PARTY プラン、月次利用上限、アップグレード導線、プラン判定ルールを扱う                             | [README](./plan/README.md) / [requirements](./plan/requirements.md) / [model](./plan/model.md)                            |
| `team`         | チーム管理           | チーム作成、所属、ロール、チームコード、アクティブチーム切り替えを扱う                                     | [README](./team/README.md) / [requirements](./team/requirements.md) / [model](./team/model.md)                            |
| `schedule`     | スケジュール管理     | スケジュール CRUD、カレンダー表示、Google カレンダー書き出し、カレンダー UI 改善を扱う                     | [README](./schedule/README.md) / [requirements](./schedule/requirements.md) / [model](./schedule/model.md)                |
| `task`         | 制作タスク管理       | カンバン、タスク詳細、担当者、カテゴリ、列設定、タスク進捗管理を扱う                                       | [README](./task/README.md) / [requirements](./task/requirements.md) / [model](./task/model.md)                            |
| `collab`       | コラボ日程調整       | コラボセッション、公開回答フォーム、再調整、複製、関連 UI を扱う                                           | [README](./collab/README.md) / [requirements](./collab/requirements.md) / [model](./collab/model.md)                      |
| `notification` | 通知                 | 通知カテゴリ、既読管理、プッシュ通知、通知設定、遷移ルールを扱う                                           | [README](./notification/README.md) / [requirements](./notification/requirements.md) / [model](./notification/model.md)    |
| `ui`           | UI・ナビゲーション   | サイドバー、TopBar、通知導線、共通ナビゲーション状態を扱う                                                 | [README](./ui/README.md) / [requirements](./ui/requirements.md) / [model](./ui/model.md)                                  |
| `platform`     | PWA・オフライン      | PWA インストール、Service Worker、オフライン閲覧、接続断時の扱いを扱う                                     | [README](./platform/README.md) / [requirements](./platform/requirements.md) / [model](./platform/model.md)                |
| `integration`  | 外部サービス連携     | Discord 連携（通知配送、Bot 招待、`/risukerugg` AI ボット）を扱う                                          | [README](./integration/README.md) / [requirements](./integration/requirements.md) / [model](./integration/model.md)       |
| `ai`           | AIチャット           | `/chat` の AI アシスタント、提案生成、スケジュール・タスク・コラボ登録連携を扱う                           | [README](./ai/README.md) / [requirements](./ai/requirements.md) / [model](./ai/model.md)                                  |
| `production`   | タスク管理 v2（1枚紙） | ブリーフ（動画1本）、工程、進め方、締切逆算、差分、操作層を扱う。既存カンバン（task）と並行提供 | [README](./production/README.md) / [requirements](./production/requirements.md) / [model](./production/model.md) / [flows](./production/flows.md) |
| `unavailability` | 対応不可時間 | メンバーが申告する対応不可の時間帯とメモ、全メンバーの一覧、メンバー詳細、CSV・定期入力を扱う（実装中。状況は README を参照） | [README](./unavailability/README.md) / [requirements](./unavailability/requirements.md) / [model](./unavailability/model.md) / [flows](./unavailability/flows.md) |

### カテゴリ別の役割

#### user

- アプリ利用開始時の本人確認とアカウント生成の責務を持つ
- 他カテゴリが参照するユーザー識別情報と認証状態の起点になる

#### plan

- 機能利用可否を決定する課金・制限ルールの責務を持つ
- タスク、コラボ、通知、チーム参加条件など横断的な判定基盤になる

#### team

- ユーザーを共同作業単位へ束ねる責務を持つ
- ロール、所属、退出、チームコードなど権限境界の基礎になる

#### schedule

- 配信予定や作業予定の時間管理責務を持つ
- カレンダー描画、説明表現、Google カレンダー書き出し、モーダル UI を含む体験の中心機能になる

#### task

- 制作タスクの状態遷移と担当管理の責務を持つ
- スケジュールや通知と連携する制作進行の中心機能になる

#### collab

- 外部相手との日程調整と確定プロセスの責務を持つ
- 公開回答導線と内部スケジュール登録を橋渡しする機能になる

#### notification

- システム内イベントをユーザーへ伝達する責務を持つ
- アプリ内通知とプッシュ通知の配信・設定・既読管理を統括する

#### ui

- 複数機能にまたがるナビゲーションと情報提示の責務を持つ
- 共通ナビゲーション状態と通知導線を通して各機能の入口を提供する

#### platform

- Web アプリの配布形態とオフライン耐性の責務を持つ
- PWA と Service Worker を通じて利用継続性を担保する

#### integration

- 外部サービス（Discord）との接続・通知配送・コマンド受け口の責務を持つ
- チーム単位の連携設定とサーバーサイド専用のセッション・一時データを管理する

#### ai

- 自然言語からの登録提案生成とチームデータ照会の責務を持つ
- Web チャットと Discord ボットが共用するシステムプロンプト・提案解析の基盤になる

#### production

- 動画1本を親にした制作進行（ブリーフ・工程・進め方）の責務を持つ
- 締切逆算・状態遷移・差分記録を操作層に集約し、Web・Discord・AI・公開 API が同じ操作を呼ぶ基盤になる

#### unavailability

- メンバーごとの対応不可時間を本人の申告で持ち、チーム全員に一覧で見せる責務を持つ
- チーム予定（schedule）とは独立し、集まれる日を探すための材料を提供する

---

## 非機能要件（spec 001）

- **NFR-001**: 初回表示（LCP）は 4G 回線のモバイル端末で 3 秒以内
- **NFR-002**: インタラクション応答（INP）は 100ms 以内
- **NFR-003**: リアルタイムデータ更新は全チームメンバーに 1 秒以内に反映
- **NFR-004**: サービス稼働率 99.5% 以上
- **NFR-005**: チームメンバーのデータは自チームのデータのみ読み書き可能（クロスチームアクセス禁止）
- **NFR-006**: ロールに応じた書き込み権限制御はサーバーサイドで強制（クライアントのみの制御は不可）
- **NFR-007**: 全通信は HTTPS 経由
- **NFR-008**: PC（Chrome/Edge/Firefox 最新 2 バージョン）と Android Chrome（最新 2 バージョン）で動作
- **NFR-009**: UI は WCAG 2.1 AA 基準のアクセシビリティを満たす
- **NFR-010**: カレンダーと通知は JST（日本標準時）基準で表示（フェーズ 1）
- **NFR-011**: プランの月次制限値はバックエンドで強制（クライアント側のみの制御は不可）
- **NFR-012**: TypeScript strict モードでコンパイルエラーゼロ
- **NFR-013**: ソースコード内のコメントは日本語。変数名・コンポーネント名は英語

---

## データモデル（主要エンティティ）

| エンティティ      | 主要フィールド                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User**          | 詳細は [user/model.md](./user/model.md) を参照。認証済みアカウントの active / ghost 状態と保持フィールドを管理                                                |
| **Plan**          | 詳細は [plan/model.md](./plan/model.md) を参照。プラン種別、月次カウント、保存先と制限判定を管理                                                            |
| **Team**          | 詳細は [team/model.md](./team/model.md) を参照。チームの保持フィールドと Firestore コレクション配置を管理                                                     |
| **TeamMember**    | 詳細は [team/model.md](./team/model.md) を参照。ロール（operator/member/rom）と所属関係を管理                                                                 |
| **TaskStatus**    | 詳細は [task/model.md](./task/model.md) を参照。タスク列定義と完了列判定を task カテゴリで正本化する                                                          |
| **Category**      | 詳細は [task/model.md](./task/model.md) を参照。タスク・スケジュール共通の統合カテゴリ定義とコレクション配置を task カテゴリで正本化する                      |
| **ScheduleEntry** | title, startAt, endAt, allDay, platform, description, participantIds, categoryId（Category 参照）, version（楽観的ロック用）                                  |
| **Task**          | 詳細は [task/model.md](./task/model.md) を参照。タスク項目と `columnId` 中心の状態表現を task カテゴリで正本化する                                            |
| **CollabSession** | 詳細は [collab/model.md](./collab/model.md) を参照。コラボ作成、公開回答、確定、再調整に必要な保持項目を管理                                                  |
| **CollabComment** | 詳細は [collab/model.md](./collab/model.md) を参照。コラボ内コメント / メモの保持項目を管理                                                                   |
| **Notification**  | receiverId, type, refEntityId, isRead, createdAt                                                                                                              |
| **SidebarState**  | collapsed（boolean）, openSections（string[]）— Zustand ストア（localStorage 永続化）                                                                         |
| **DiscordTeamConfig** | 詳細は [integration/model.md](./integration/model.md) を参照。チームの Discord 通知設定（webhookUrl / guildId / channelId / 通知トグル）を管理             |
| **DiscordSession** | 詳細は [integration/model.md](./integration/model.md) を参照。`/risukerugg` AI ボットのサーバー単位会話セッションを管理                                      |
| **ChatMessage / Proposal** | 詳細は [ai/model.md](./ai/model.md) を参照。AIチャットの会話履歴と登録提案（セッションメモリのみ・Firestore 永続化なし）                             |
| **Playbook / Brief / Step / BriefEvent** | 詳細は [production/model.md](./production/model.md) を参照。進め方（工程の型）、ブリーフ（動画1本）、工程、差分                                 |
| **UnavailabilityMonth** | 詳細は [unavailability/model.md](./unavailability/model.md) を参照。1 人 1 ヶ月の対応不可（日ごとの 24 ビットマスク）とメモ |

---

## フェーズ 1 スコープ外（将来対応）

- PARTYプランの決済処理（Stripe 等）
- YouTube / Twitch API 連携
- 配信スケジュールの繰り返し設定
- チームの削除・解散フロー
- オフライン書き込み（楽観的更新キュー）
- iOS PWA 対応の最適化
- 多言語対応（日本語のみ）
- 国際タイムゾーン対応（JST 固定）

> 注記: ブランチ単位の実装状況サマリーは speckit 廃止（2026-07-15）に伴い削除した。過去の実装経緯は Git 履歴を参照し、現行仕様は本ドキュメントおよび各カテゴリ配下の詳細ファイルを正本とする。
