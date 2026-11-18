# platform model

## 対象モデル

現時点では PWA・オフラインカテゴリに専用の永続モデルは明示していない。

## ReleaseNote（未実装・Issue #216）

リリースノート 1 件。`src/lib/releaseNotes.ts` に `RELEASE_NOTES: ReleaseNote[]` として新しい順に持つ。Firestore には保存しない。

| フィールド | 型                    | 意味 |
| ---------- | --------------------- | ---- |
| `version`  | string                | バージョン番号（例: `0.2.0`）。先頭の 1 件は `package.json` の `version` と一致する |
| `date`     | string                | 公開日（JST、`YYYY-MM-DD`）。そのまま表示する |
| `summary`  | string \| undefined   | そのリリースのひとこと |
| `added`    | string[] \| undefined | 追加: 新しくできるようになったこと |
| `changed`  | string[] \| undefined | 変更: これまでの動きや見た目が変わったこと |
| `fixed`    | string[] \| undefined | 修正: 直した不具合 |

## 今後詳細化する項目

- キャッシュメタ情報
- オフライン状態管理
- インストール可否判定の補助情報
