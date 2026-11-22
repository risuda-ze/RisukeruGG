# platform model

## 対象モデル

現時点では PWA・オフラインカテゴリに専用の永続モデルは明示していない。

## ReleaseNote

リリースノート 1 件。`src/lib/releaseNotes.ts` に `RELEASE_NOTES: ReleaseNote[]` として新しい順に持つ。Firestore には保存しない。

| フィールド | 型     | 意味 |
| ---------- | ------ | ---- |
| `version`  | string | バージョン番号（例: `0.2.0`）。見出しとアンカー `#v{version}` に使う。先頭の 1 件は `package.json` の `version` と一致する |
| `date`     | string | 公開日（JST、`YYYY-MM-DD`）。そのまま表示する |
| `body`     | string | そのリリースの更新内容（Markdown）。GitHub Releases の下書きから移した本文で、ページに描画する |

## 今後詳細化する項目

- キャッシュメタ情報
- オフライン状態管理
- インストール可否判定の補助情報
