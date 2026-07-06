# UI パフォーマンス改善 変更仕様

## 背景・目的

現状、UI操作にもっさり感（操作遅延）がある。原因調査の結果、**クライアント側の不要な再レンダリングと派生データの毎回再計算**が主因と特定した。本変更では **データ構造・API・認証フロー・UIデザイン・機能には一切手を加えず、内部のレンダリング効率のみを改善**し、操作レスポンスの体感を向上させる。

## 全体方針・共通の注意事項

- **表示結果・機能・UIデザインは変更前と完全に同一を維持する**（純粋な内部最適化）。
- Firestore スキーマ / Cloud Functions / API / 認証フローには触れない。
- CLAUDE.md の評価基準「**回帰なし 5/5 必須**」を厳守。各変更後に回帰確認を行う。
- ブランチ: `feature/ui-performance-optimization`（`develop` 起点）。マージ先は `develop`。
- 適用順は「効果とリスクのバランス順」で **変更2 → 変更4 → 変更1 → 変更3**。1点ずつユーザー確認を取って進める。
- 各変更後に `pnpm typecheck` / `pnpm lint` / `pnpm test` を実行する。

### 各変更後に必須の回帰確認項目

- ドラッグ&ドロップでの列移動
- カテゴリ／担当者フィルタの絞り込み
- モバイル ⇄ PC のレイアウト切替
- タスク追加・編集・削除モーダルの開閉と保存

---

## 変更1：Zustand をセレクタ購読に変更

### 作業内容
全コンポーネントで `const { ... } = useXxxStore()`（ストア全体購読）となっている箇所を、**必要な値だけを選択するセレクタ購読**に置き換える。複数値を取得する場合は zustand v5 同梱の `useShallow` を用いる（または値ごとに個別セレクタへ分割）。

対象は `useAuthStore` / `useTasksStore` / `useCategoryStore` / `useScheduleStore` / `useNotificationsStore` / `useSidebarStore` / `useAiChatStore` の全消費箇所（40箇所以上）。

### 要件（実装のゴール）
- トークンリフレッシュ（`onIdTokenChanged`）や無関係な Firestore snapshot 発火時に、その値を使っていないコンポーネントが再レンダリングされないこと。
- 表示結果は変更前と同一であること。

### 注意事項
- ⚠️ **最重要**: `useStore(s => ({ a: s.a, b: s.b }))` のようにオブジェクトをそのまま返すと毎回新規参照となり、**無限再レンダリングまたは逆効果**になる。必ず `useShallow` でラップするか、値ごとに個別セレクタへ分割すること。
- `subscribe` などの関数はストア生成時に固定参照のため、セレクタで取得しても安定している。
- アクション関数と状態値を混在取得する場合の参照安定性に注意する。

### 作業範囲
- `src/stores/*.ts`（必要に応じて `useShallow` 対応のエクスポート整理）
- `src/app/(protected)/**/page.tsx` 全般
- `src/components/**`（ストアを消費する全コンポーネント）

---

## 変更2：PC/モバイルボードを片方だけマウント

### 作業内容
`src/app/(protected)/tasks/page.tsx` で `KanbanBoard`（`hidden md:flex`）と `TaskMobileBoard`（`flex md:hidden`）を **CSS で隠して両方マウント** している状態をやめ、`useMediaQuery` で **ビューポートに応じて片方だけをマウント** する。

### 要件（実装のゴール）
- PC 表示時はモバイルボードを描画しない（およびその逆）。
- 表示・操作結果は変更前と同一であること。

### 注意事項
- ⚠️ `TaskMobileBoard` は内部 state `selectedColumnId` を持つため、ブレークポイントをまたぐリサイズで選択カラムが先頭にリセットされる（通常利用では問題なし、想定内挙動として許容）。
- `useMediaQuery` は初期値を `window` から同期取得するため表示チラつきは基本発生しないが、SSR 初回のみ `false` 扱いになる点を確認する（`KanbanBoard` は `ssr:false` の dynamic import）。
- ブレークポイント値（`md` = 768px）を Tailwind の定義と一致させる。

### 作業範囲
- `src/app/(protected)/tasks/page.tsx`（156〜181行付近のレイアウト分岐のみ）

---

## 変更3：TaskCard の React.memo 化 ＋ props 化

### 作業内容
`TaskCard` を `React.memo` でメモ化する。あわせて、`TaskCard` 内部で個別購読している `useTasksStore`（columns）/ `useCategoryStore`（categories）を廃止し、**親から props で `members` / `categories` / `columns` を受け取る**形に配線変更する。

### 要件（実装のゴール）
- 1枚のタスク更新・ドラッグ時に、変更のないカードが再レンダリングされないこと。
- カードごとの `find()` 走査（members / categories / columns）が毎回全カードで走らないこと。
- 表示結果は変更前と同一であること。

### 注意事項
- ⚠️ **memo 付与だけでは効かない**。親が `onEdit={() => onEditTask(task)}` と毎回新しい関数を渡しているため、`TaskCard` の `onEdit`/`onDelete` を `(task) => void` 型に変更して内部で `onEdit(task)` を呼ぶ形にし、親側コールバックを `useCallback` で安定化する。
- props で渡す `members` / `categories` / `columns` の配列参照がレンダリング毎に新規生成されないよう、ストアから取得した参照をそのまま流す（変更1のセレクタ化と整合させる）。
- `KanbanBoard → TaskStatusPanel → TaskCard` と `TaskMobileBoard → TaskCard` の両経路で配線を揃える。

### 作業範囲
- `src/components/kanban/TaskCard.tsx`
- `src/components/kanban/KanbanBoard.tsx`（TaskStatusPanel 含む）
- `src/components/kanban/TaskMobileBoard.tsx`
- 呼び出し元 `src/app/(protected)/tasks/page.tsx`（props 追加が必要な場合）

---

## 変更4：派生データの useMemo 化

### 作業内容
レンダリング毎に再計算されているフィルタ・ソート処理を `useMemo` でメモ化する。

- `tasks/page.tsx` の `filteredTasks`（カテゴリ／担当者フィルタ）
- `KanbanBoard` のカラム別 `sortTasksByDueDate(tasks.filter(...))`
- `TaskMobileBoard` の `columnTasks` / カラム別件数

### 要件（実装のゴール）
- 入力（tasks / フィルタ条件）が変わらない限り、フィルタ・ソートが再計算されないこと。
- フィルタ結果・並び順は変更前と同一であること。

### 注意事項
- ⚠️ 依存配列の付け忘れによる **フィルタ結果の反映漏れ** に注意（`activeCategoryIds` / `activeAssigneeId` / `tasks` / `columns` を漏れなく指定）。
- メモ化した配列参照が変更3の props 安定化と整合すること。

### 作業範囲
- `src/app/(protected)/tasks/page.tsx`
- `src/components/kanban/KanbanBoard.tsx`
- `src/components/kanban/TaskMobileBoard.tsx`

---

## 影響範囲まとめ

| 観点 | 影響 |
|---|---|
| データ / API / 認証 | 変更なし |
| UIデザイン / 機能 | 変更なし |
| バンドルサイズ | ほぼ不変 |
| レンダリング挙動 | 改善（不要な再レンダリング・再計算を削減） |
| リスク順 | 変更1 > 変更3 > 変更2 > 変更4（1・3は「参照の安定性」を誤ると逆効果） |
