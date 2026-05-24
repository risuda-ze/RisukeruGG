# Research: テストスイート見直し・CI信頼性向上

## 1. Playwright プロジェクト分離パターン

**Decision**: Playwright `projects` 設定を使い、`smoke` と `emulator` の2プロジェクトに分離する。

**Rationale**:
- Playwright の `projects` 設定は `testMatch`/`testIgnore` で対象ファイルを制御できる。
- `--project=smoke` フラグでCI実行時に特定プロジェクトのみ実行可能。
- `webServer` 設定はプロジェクト共通。`emulator` プロジェクトはWebServer設定を引き継ぐ。

**Alternatives considered**:
- `test.skip(!!process.env.CI)` でCIをスキップ: 環境変数に依存し、ローカルでCI変数を設定すると挙動が変わるため却下。
- `--grep-invert @emulator` タグ方式: grep文字列でのフィルタリングは`--project`より直感的でないため却下。
- Playwright `testIgnore` + 環境変数: `playwright.config.ts` 内で `process.env.CI` チェックは可能だが、2プロジェクト方式の方が明示的で意図が明確。

```ts
// playwright.config.ts の概要
projects: [
  {
    name: 'smoke',
    testMatch: ['**/e2e/login.spec.ts', '**/e2e/schedule.spec.ts', '**/e2e/tasks.spec.ts'],
  },
  {
    name: 'emulator',
    testMatch: ['**/e2e/visual.spec.ts'],
  },
]
```

---

## 2. CI E2Eジョブの修正

**Decision**: `pnpm exec playwright test --project=smoke` をCIで使用する。

**Rationale**:
- `pnpm test:e2e` スクリプトは `playwright test` を実行する（全プロジェクト）。
- CIでは `--project=smoke` を追加してスモークテストのみ実行する。
- `package.json` に `"test:e2e:smoke": "playwright test --project=smoke"` スクリプトを追加する方が管理しやすい。

**Alternatives considered**:
- `e2e-tests` ジョブを削除: 回帰を検知できなくなるため却下。
- Firebase EmulatorをCI環境でセットアップ: docker-compose設定が必要で複雑、今回のスコープ外。

---

## 3. 既存E2Eスモークテストの状態評価

**`login.spec.ts`** (2テスト):
- ログインページのUI確認 → Emulator不要、Firebaseに接続しない
- 未認証リダイレクト確認 → Emulator不要
- **結論**: CIで安全に実行可能 ✅

**`schedule.spec.ts`** (1テスト):
- 未認証→ログインリダイレクト確認 → Emulator不要
- **結論**: CIで安全に実行可能 ✅

**`tasks.spec.ts`** (2テスト):
- 未認証リダイレクト確認 → Emulator不要
- ログインページのbody表示確認 → Emulator不要
- **結論**: CIで安全に実行可能 ✅

**`visual.spec.ts`** (7テスト):
- Firebase Emulator REST API（localhost:9099）へのサインイン
- `__firebaseEmulatorsConnected` フラグ待機（10秒タイムアウト）
- シードデータ（`taro@example.com`）が必要
- **結論**: CI実行不可 → `emulator` プロジェクト専用 🔴

---

## 4. ユニットテスト補完内容の検討

**Decision**: `tests/unit/teams/leaveTeamLogic.test.ts` を追加し、Sprint 008 で実装したチーム脱退ロジックをテストする。

**Rationale**:
- Sprint 008 `leaveSpecificTeam` / `leaveTeam` は純粋なロジック（メンバー数チェック→削除判断）を含む。
- ただし、Cloud Functions の実装は Firebase Admin SDK を使用しており、ユニットテストで直接インポートするのは困難（Firebase依存）。
- そのため、**Cloud Functionsの実装から純粋ロジック部分を抽出した関数**をテスト対象とする（`columnTransition.test.ts` の手法と同様）。

**Alternatives considered**:
- Cloud Functionsを直接インポートしてモック: Firebase Admin SDKのモックが複雑で保守コストが高いため却下。
- Firebase Emulatorを使った統合テスト: Vitest環境では困難。Playwrightのemulatorプロジェクトで対応する方が適切。

**テスト対象ロジック**:
```
canOperatorLeave(memberCount: number): boolean
  → memberCount <= 1 の場合 true（ソロチームは脱退可能）
  → memberCount > 1 の場合 false（複数メンバーは脱退不可）
```

---

## 5. 型整合性の確認

**Decision**: 既存ユニットテストの型定義は現行 `entities.ts` と整合している。変更不要。

**Rationale**:
- `KanbanColumn.role: 'done' | null` → `columnTransition.test.ts` で使用 ✅
- `CollabSession` のすべてのフィールド → `collabSession.test.ts` で使用 ✅
- `Task.categoryId: string | null` (旧 `TaskCategoryKey` から変更) → テストで直接使用していない ✅

---

## 6. `package.json` スクリプト更新

**Decision**: `test:e2e:smoke` スクリプトを追加する。

```json
"test:e2e:smoke": "playwright test --project=smoke"
```

**Rationale**:
- CIからは `pnpm test:e2e:smoke` で呼び出す。
- ローカルでは `pnpm test:e2e` で全テスト（smoke + emulator）を実行できる。
- 既存の `test:e2e` スクリプトを変更しないため後方互換性を維持。
