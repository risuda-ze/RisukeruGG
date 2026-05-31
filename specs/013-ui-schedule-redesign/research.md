# Research: UIリデザイン v2 — 統合モーダル・ホバー・カラー修正

## 1. 統合モーダル方針

### Decision: ScheduleForm + ScheduleDetailModal → ScheduleModal に統合
- **Rationale**: デザインファイル（schedule-pc.jsx）は `ScheduleModal` と `DetailForm` の単一構造。追加・編集で同一フォームを使う。Constitution I（シンプルさ優先）に合致。
- **From**: `ScheduleForm`（Modal内、新規用）+ `ScheduleDetailModal`（編集用の複雑なコンポーネント）
- **To**: `ScheduleModal`（新規・編集統合）+ `DetailForm`（フォーム本体、ScheduleModal内）
- **旧 ScheduleDetailModal の機能**: コメント機能・ドラッグ移動・マークダウン説明編集は **v2 仕様（spec.md FR-024 / 2026-05-31 更新）により新 ScheduleModal への移植対象に変更された**。v1 計画では削除対象だったが、ユーザー要求により引き継ぎが必要と判断（T043 で実装）。
- **Alternatives**: 2コンポーネント維持 → 重複コード・UX不統一のため却下

---

## 2. 終日トグルの双方向化

### Decision: `setAllDay((v) => !v)` に変更
- **Rationale**: 現行 `handleAllDay()` は `setIsAllDay(true)` 一方向のみ。デザインファイルは `onClick={() => setAllDay((v) => !v)}` で双方向トグル。
- **Implementation**: ScheduleForm の `handleAllDay` 関数を削除し、終日トグルの onClick を `() => setIsAllDay((v) => !v)` に変更。allDay=true 時に startAt・endAt の時間を00:00にリセットするロジックは維持。

---

## 3. Avatar の hop アニメーション

### Decision: Avatar コンポーネントに `ds-avatar` クラスを追加
- **Rationale**: globals.css の `.ds-avatar:hover { animation: hop 0.55s var(--ease-out); }` が定義されているが、Avatar コンポーネントが `ds-avatar` クラスを使っていないため機能しない。
- **Implementation**: `src/components/ui/Avatar.tsx` の root div に `ds-avatar` クラスを追加するだけ。
- **Alternatives**: Tailwind の `hover:animate-...` → globals.css の `hop` keyframe は参照できないため却下

---

## 4. ボタンホバー色変化の確認

### Decision: 現行 globals.css の定義で動作確認、必要なら補完
- **Rationale**: globals.css に `.btn--primary:hover { background: var(--pink); ... }` は定義済み。`Button` コンポーネントは `.btn--primary` クラスを生成する。
- **確認事項**: 実際の表示でピンクホバーが発火しているか確認する。
- **Issue**: `Button` コンポーネントの実装で `btn--ghost` などのクラスが正しく付与されているかを確認。

---

## 5. DESIGN.md とglobals.css の色の差分

### Decision: globals.css と DESIGN.md を照合し差分を修正
- **差分分析**:

| プロパティ | DESIGN.md | globals.css | 一致 |
|---|---|---|---|
| `--primary` | `#7f77dd` | `#7f77dd` | ✅ |
| `--bg` | `#0a0a18` | `#0a0a18` | ✅ |
| `--surface` | `#11112a` | `#11112a` | ✅ |
| `--card` | `#16163a` | `#16163a` | ✅ |
| `--card-raised` | `#1c1c42` | `#1c1c42` | ✅ |
| `--border` | `#2a2a55` | `#2a2a55` | ✅ |
| `--border-light` | `#3a3a6a` | `#3a3a6a` | ✅ |
| `--glow-primary` | `0 0 16px rgba(127,119,221,0.5)` | `0 0 calc(16px * var(--glow-mult)) rgba(127,119,221,calc(0.5 * var(--glow-mult)))` | ✅ (動的版) |
| `--card-border` | (不記載) | `color-mix(in oklab, #534ab7 52%, #2a2a55)` | n/a |
| `--pink` | (不記載) | `#ec4f95` | n/a (追加定義) |
| `--glow-pink` | (不記載) | `0 0 calc(18px * var(--glow-mult, 1)) rgba(236, 79, 149, 0.5)` | n/a (追加定義) |

- **結論**: 主要色はすべて一致。`--card-border` や `--pink` はデザインファイルで追加されたが DESIGN.md に未記載。DESIGN.md に追記すべき差分項目:
  - `--card-border`: `color-mix(in oklab, #534ab7 52%, #2a2a55)` 相当
  - `--pink`, `--glow-pink` のピンクアクセント定義

---

## 6. ScheduleModal のデザイン仕様詳細

設計ファイルの `DetailForm` コンポーネント（schedule-pc.jsx）から:

### レイアウト
```
[タイトル入力（テキストボックス、大きめ）]
[カテゴリ（Dropdown）]
[2カラムグリッド]
  左カラム:
    [開始日時ラベル ───────────── 終日トグル]
    [DateField（開始）]
  右カラム:
    [終了日時ラベル]
    [DateField（終了）]
[説明（textarea）]
[フッター: delete(isNew=false) | cancel | save]
```

### 終日トグル
```jsx
<label className={`allday${allDay ? ' is-on' : ''}`} onClick={() => setAllDay((v) => !v)}>
  <span className="allday__txt">終日</span>
  <span className="allday__sw" />
</label>
```

### モーダルヘッダー
```jsx
isNew ? '予定を追加' : '予定を編集'
isNew ? '新しい予定の内容を入力して保存してください。' : '予定の内容を編集して保存してください。'
```

### フッター
```jsx
{!isNew && <Button variant="danger">削除</Button>}
<div className="flex-1" />
<Button variant="subtle">キャンセル</Button>
<Button variant="primary">保存</Button>
```

---

## 7. 既存コンポーネントの再利用可否

| コンポーネント | 状態 | 対応 |
|---|---|---|
| `DateField.tsx` | ✅ 作成済み (T006) | そのまま使用 |
| `HintBar.tsx` | ✅ 作成済み (T005) | そのまま使用 |
| `useHintDismiss.ts` | ✅ 作成済み (T002) | そのまま使用 |
| `ScheduleForm.tsx` | ⚠️ 旧設計 | ScheduleModal内のDetailFormに置き換え or 修正 |
| `ScheduleDetailModal.tsx` | ⚠️ 旧設計 | ScheduleModal に全面置き換え |
| `Avatar.tsx` | ⚠️ `ds-avatar`クラス未使用 | `ds-avatar` クラス追加 |
| `Modal.tsx` (generic) | ✅ 継続使用 | ScheduleModal は独自モーダルとして実装（870px固定幅） |
