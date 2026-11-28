# コラボ詳細の保存と削除の失敗表示 変更仕様

**作成日**: 2026-11-28
**状態**: 仕様確定前（Issue #274・#305。仕様と実装を同じ PR で扱う）
**正本**: [collab/requirements.md](../仕様・計画/collab/requirements.md)（CO-031・CO-032）

## 背景・目的

- #274: コラボ調整の一覧で、スタッフにも削除ボタンが出る。押すと `cancelCollabSession` が権限エラーで拒否されるが、画面には何も出ない。コラボの削除はメンバーだけができる（`two-roles.md` の権限表）
- #305: コラボ詳細は開いた時点の文書を持ち続ける。開いている間に外部の回答者が回答・代替日程を送った後、メンバーが候補日程を追加・編集・削除して保存すると、`participantResponses` と `proposedDates` を開いた時点の値で丸ごと書き、届いた回答と代替日程が消える

## 現状（develop の実コードで確認）

| 対象 | 状態 |
| --- | --- |
| `src/app/(protected)/collabs/page.tsx` | 一覧の行（PC・モバイル）の削除ボタンに `canEdit` の条件が無い。`handleDelete` は `try/finally` だけで、失敗を表示しない |
| `src/components/collab/CollabDetailModal.tsx` | 保存（`persistLocalChanges`）は `updateDoc`。候補日程を変えると `proposedDates` / `participantResponses` を丸ごと書く。保存・調整を確定・削除・再調整は失敗を表示しない（作成だけ表示する） |
| `src/app/(protected)/collabs/[id]/page.tsx` | 確定・キャンセルは失敗を表示しない |
| `functions/src/collab/respondToCollab.ts` | `participantResponses.<キー>` をフィールド単位で書き、代替日程は `proposedDates` に `arrayUnion` で足す。`updatedAt` を更新する |

## 決定事項

| 項目 | 決定 |
| --- | --- |
| 削除ボタンの表示 | 一覧の行の削除ボタンはメンバー（`canEdit`）のときだけ出す。詳細画面・`/collabs/[id]` は既に `canEdit` で出し分けている |
| 失敗の表示 | 一覧の削除の失敗はトーストで出す。詳細画面の保存・調整を確定・削除・再調整、`/collabs/[id]` の確定・キャンセルの失敗は、その画面の操作ボタンの近くに出す。文言は `firebaseFunctionsErrorMessage`（Functions の失敗）に従う |
| 保存の競合 | 候補日程か回答（`proposedDates` / `participantResponses`）を書く保存は、トランザクションで文書を読み、`updatedAt` が開いた時点と違えば保存せず「開いている間にこのコラボが更新されました。開き直してから編集してください」と出す。タスク（TA-017）と同じ考え方 |
| 競合を見ない保存 | 候補日程を変えていない保存（タイトル・内容・アイコン・参加者だけ）は、従来どおり変えたフィールドだけを書き、競合を見ない。回答者は `participantResponses` と `proposedDates` しか書かないため、上書きは起きない |
| 調整を確定 | 確定の前に行う保存にも同じ規則を当てる。競合したら確定しない |
| 採らなかった案 | トランザクションで最新の文書に候補日程の追加・編集・削除を当て直す案。回答者の代替日程が末尾に入るため、ローカルで足した候補の位置がずれ、操作の記録と当て直しが要る。保存を止めて開き直す方が単純で、TA-017 と揃う |

## 仕様書変更箇所

| ファイル | 変更 |
| --- | --- |
| `docs/仕様・計画/collab/requirements.md` | CO-031（削除ボタンの出し分けと失敗の表示）、CO-032（保存の競合）を追加 |

## 受入条件

- **AC-1**: スタッフで `/collabs` を開くと、一覧の行（PC・モバイル）に削除ボタンが出ない。メンバーでは出る
- **AC-2**: 一覧の削除が失敗すると、トーストで理由が出て、一覧はそのまま残る
- **AC-3**: 詳細画面の保存・調整を確定・削除・再調整が失敗すると、詳細画面に理由が出て、詳細画面は閉じない。`/collabs/[id]` の確定・キャンセルの失敗も画面に出る
- **AC-4**: 詳細画面を開いた後に回答が届き（`updatedAt` が変わり）、候補日程を追加・編集・削除して保存すると、保存されず競合の文言が出る。文書の `participantResponses` / `proposedDates` は回答後のまま
- **AC-5**: 開いた後に文書が変わっていなければ、候補日程を削除した保存は従来どおり `participantResponses` を再インデックスして書く（CO-014）
- **AC-6**: タイトル・内容・アイコン・参加者だけを変えた保存は、開いた後に回答が届いていても成功し、`proposedDates` / `participantResponses` を書かない
- **AC-7**: この端末で保存した直後（`updatedAt` がサーバーで未確定）のスナップショットから開き直しても、競合と誤判定しない

## 影響ファイル

- `src/app/(protected)/collabs/page.tsx`、`src/app/(protected)/collabs/[id]/page.tsx`
- `src/components/collab/CollabDetailModal.tsx`
- `src/lib/repositories/collabs.ts`（保存の競合検知、購読の `serverTimestamps: 'previous'`）
- `src/lib/collab/`（保存内容を組み立てる純粋関数）
- `tests/unit/collab/`
