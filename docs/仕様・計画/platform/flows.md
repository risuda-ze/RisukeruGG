# platform flows

## 今後詳細化するフロー

### PWA インストールフロー

- インストール可能判定
- プロンプト表示
- ユーザー選択
- ホーム画面追加

### オフライン閲覧フロー

- 通信断検知
- キャッシュ読込
- 閲覧継続
- 書き込み時メッセージ表示

## リリースノート閲覧フロー

1. ユーザーが個人設定の「アプリ情報」タブを開く
2. システムが `v{version}` を表示する
3. ユーザーがバージョンをクリックする
4. システムが `/release-notes` を別タブで開き、全バージョンを新しい順に表示する

未ログインの閲覧者は LP フッターの「リリースノート」または URL の直接入力で同じページを開く。ログインは求めない。

## リリースノートの原稿更新フロー

1. 開発者がリリースノートに載せる変更（利用者に見える変更・セキュリティに関する変更・不具合の修正）を `develop` へマージするたびに、GitHub の下書き Release（次回分を 1 件だけ持つ）に 1 行足す
2. リリース時、開発者が `develop` から `feature/release-v{version}` を切る
3. `package.json` の `version` を上げ、下書きの本文を `src/lib/releaseNotes.ts` の先頭に 1 件として移す
4. ユニットテストが先頭のバージョンと `package.json` の一致を確認する
5. `develop` へマージしたうえで、`develop` → `main` のリリース PR をマージする。このデプロイでリリースノートが公開される
6. 開発者が下書き Release をタグ `v{version}`、Target `main` で公開する

リリースノートに載せる変更が無いリリースでは 2〜4 と 6 を行わない。公開済みの原稿は、誤記の訂正を除いて書き換えない。

## リリースフロー（`develop` → `main`）

1. 開発者が、前回のリリース以降に `develop` へ入った変更から次の 2 つを洗い出す
   - Firebase へのデプロイが要る変更（`firestore.rules`・`firestore.indexes.json`・`functions/`）
   - `scripts/migration-runbook.md` の「適用待ちの一回性スクリプト」
2. リリースノートに載せる変更があれば、「リリースノートの原稿更新フロー」の 2〜4 を行う
3. `develop` → `main` のリリース PR を merge commit でマージする。Vercel が本番へデプロイする
4. 1 で洗い出した Firebase へのデプロイを行う（`firebase deploy --only firestore` / `firebase deploy --only functions`）
5. 適用待ちの移行スクリプトを runbook の手順で実行する（dry-run → `--apply` → もう一度 dry-run で対象 0 件を確認）。実行タイミングの指定が runbook にあればそれに従う
6. 適用したスクリプトと runbook の該当行を削除する PR を `develop` へ出す
7. 「リリースノートの原稿更新フロー」の 6 を行う

1 で該当が無ければ 4〜6 を行わない。
