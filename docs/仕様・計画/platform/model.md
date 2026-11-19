# platform model

## 対象モデル

現時点では PWA・オフラインカテゴリに専用の永続モデルは明示していない。

## ReleaseNote（未実装）

リリースノート 1 件。GitHub Releases の公開済み Release 1 件から作る表示用のデータで、アプリ側には保存しない（Firestore にも持たない）。

| フィールド    | 型     | 意味 |
| ------------- | ------ | ---- |
| `version`     | string | バージョン番号（例: `0.2.0`）。Release のタグ `v{version}` から先頭の `v` を除いたもの。見出しとアンカー `#v{version}` に使う |
| `publishedAt` | string | Release の公開日時（ISO 8601）。JST の日付にして公開日として表示し、並び順（新しい順）にも使う |
| `body`        | string | Release の本文（Markdown）。そのリリースの更新内容として描画する |

## 今後詳細化する項目

- キャッシュメタ情報
- オフライン状態管理
- インストール可否判定の補助情報
