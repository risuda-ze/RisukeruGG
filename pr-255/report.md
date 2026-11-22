## 最終レポート（PR #255 / HEAD 677fb05）

### 何が変わったか
本番の Firestore にある旧ロール（member / rom / editor / viewer）を `staff` に寄せる、一回限りの移行スクリプトを追加した。
- `scripts/migrate-roles-to-staff.mjs`（新規）
  - 対象は `teams/{id}/members/{uid}` のみ。operator / owner / staff は変更しない。
  - 未知の値（"admin"、role 欠落など）は書き換えず一覧表示し、終了コード 2 を返す。
  - 既定は dry-run（書き込みなし）。`--apply` を付けたときだけ書き込む（400 件ずつのバッチ）。
- `scripts/migration-runbook.md`: 本番作業①の手順（dry-run → apply → 再 dry-run → 0 件確認、未知値があるときの確認方法）を追記。

画面の変更はない（src/app などの変更なし）。lint / E2E 定義の変更もない。

### 確認結果
- Emulator で手動検証: 旧 4 種 + operator / owner / staff の 7 種、未知の値（"admin"・role 欠落）、ネストした members（`teams/t1/foo/a/members/zz`）を投入。
  - dry-run は書き込みなし、対象 4 件、exit 2。
  - `--apply` で 4 件を書き換え。
  - 再 dry-run で対象 0 件。operator / owner / 未知 2 件は不変。ネストは対象外。
- CI は通過済み。
- 一次・二次レビューとも現 HEAD に対し scope=full で pass。範囲外の起票なし。
- **本番では未実行。**

### 本番での使い方（人が実施）
1. PR A（互換対応）の本番反映後、PR B のデプロイ前に実行する。
2. dry-run → `--apply` → 再 dry-run の順で行い、対象 0 件を確認する。未知の値が残る場合は旧値の行が一覧に無いことを確認し、内容を調べる。
3. 0 件確認が済むまで PR B はデプロイしない。
4. PR B のデプロイ後は実行しない（誤実行の危険がある）。
5. 適用後に、スクリプトと runbook の該当行を削除する。

### 人が見るべき点
- 本番のサービスアカウントキーの扱いと、実行タイミング（上記 1・3）。
