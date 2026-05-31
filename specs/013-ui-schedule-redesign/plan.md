# Implementation Plan: UIリデザイン v2 — 統合モーダル・ホバー・カラー修正

**Branch**: `013-ui-schedule-redesign` | **Date**: 2026-05-31 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/013-ui-schedule-redesign/spec.md`

---

## Summary

前フェーズ（v1）で実装した共通レイアウト・スケジュール一覧を維持しつつ、以下5点を修正する:
1. 予定追加・編集を単一の `ScheduleModal` コンポーネントに統合
2. スケジュール詳細UIをデザイン仕様（schedule-pc.jsx）に一致させる
3. アイコン・バッジ・アバターのホバー挙動をデザイン仕様に合わせる
4. ボタンのホバー色変化を確認・修正する
5. 終日トグルを双方向（ON→OFF→ON）にする

---

## Technical Context

**Language/Version**: TypeScript 5.x（Next.js 14 App Router）  
**Primary Dependencies**: React 19, Tailwind CSS v4, Zustand, date-fns v4, Firebase v12  
**Storage**: 既存 Firestore（変更なし）  
**Testing**: Vitest（ユニット）, Playwright（E2E）  
**Target Platform**: Web（PC + モバイルレスポンシブ）  
**Project Type**: フロントエンド変更のみ  
**Scope**: 5ファイル変更 + 1ファイル新規 + 1ファイル削除

---

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. シンプルさ優先 | ✅ Pass | 2コンポーネント→1コンポーネントへの統合はコード削減 |
| II. TypeScript型安全 | ✅ Pass | 全コンポーネントに明示的な Props 型 |
| III. テスト方針 | ✅ Pass | UIコンポーネントのテストは任意 |
| IV. Firebase・セキュリティ | ✅ Pass | Firestore 変更なし |
| V. 日本語コメント | ✅ Pass | コメントは日本語で記述する |

---

## Project Structure

### Documentation (this feature)

```text
specs/013-ui-schedule-redesign/
├── plan.md           # This file
├── spec.md           # v2 spec（統合モーダル・ホバー・カラー追加）
├── research.md       # 設計判断の記録
├── data-model.md     # Props インターフェース
├── deprecated.md     # 削除ファイルの記録
└── tasks.md          # Phase 2 output (/speckit-tasks で生成)
```

### Source Code（変更対象ファイル）

```text
src/
├── components/
│   ├── calendar/
│   │   ├── ScheduleModal.tsx       # 新規: ScheduleForm + ScheduleDetailModal を統合
│   │   ├── ScheduleDetailModal.tsx # 削除: ScheduleModal に置き換え
│   │   └── ScheduleForm.tsx        # 削除: ScheduleModal に統合
│   └── ui/
│       └── Avatar.tsx              # 変更: ds-avatar クラス追加
├── app/
│   └── (protected)/
│       └── schedule/
│           └── page.tsx            # 変更: ScheduleModal を使うよう更新
└── docs/
    └── DESIGN.md                   # 変更: pink・card-border 色定義を追記
```

---

## Sprint 1: 統合モーダル実装（US5）

### 変更内容

#### 1-1. ScheduleModal.tsx 新規作成

ファイル: `src/components/calendar/ScheduleModal.tsx`

```typescript
'use client';

interface ScheduleModalProps {
  schedule: ScheduleEntry | null;  // null=新規追加
  initialDate?: Date;              // セルクリック時の初期日付
  teamId: string;
  canEdit: boolean;
  categories: ScheduleCategory[];
  onClose: () => void;
  onDeleted: () => void;
}
```

**構造（デザインファイル schedule-pc.jsx に準拠）**:

```tsx
// モーダルオーバーレイ (position: absolute, inset 0, z-index 120)
<div className="smodal">
  <div className="smodal__scrim" onClick={onClose} />
  <div className="smodal__card animate-pop-modal" role="dialog">
    
    {/* ヘッダー */}
    <div className="smodal__hd">
      <div>
        <h2 className="smodal__title">
          <Icon name={isNew ? "add" : "edit"} />
          {isNew ? '予定を追加' : '予定を編集'}
        </h2>
        <p className="smodal__sub">
          {isNew ? '新しい予定の内容を入力して保存してください。' : '予定の内容を編集して保存してください。'}
        </p>
      </div>
      <button className="smodal__close" onClick={onClose}>
        <Icon name="close" />
      </button>
    </div>
    
    {/* フォーム本体（DetailForm） */}
    <DetailForm
      schedule={schedule}
      categories={categories}
      onCancel={onClose}
      onSave={handleSave}
      onDelete={isNew ? undefined : handleDelete}
      saving={saving}
      error={error}
    />
  </div>
</div>
```

**DetailForm レイアウト**:

```tsx
<div className="sform">
  <div className="sform__inner">
    
    {/* タイトル */}
    <div className="sform__row">
      <label className="sform__label">タイトル*</label>
      <input className="sform__title-input" value={title} onChange={setTitle} />
    </div>
    
    {/* カテゴリ */}
    <div className="sform__row">
      <label className="sform__label">カテゴリ*</label>
      <Dropdown ... />
    </div>
    
    {/* 2カラムグリッド: 開始日時 + 終了日時 */}
    <div className="sform__grid2">
      <div className="sform__row">
        {/* 開始日時ラベル + 終日トグル（右揃え） */}
        <div className="sform__labelrow">
          <label className="sform__label">開始日時*</label>
          {/* 双方向終日トグル */}
          <label className={`allday${allDay ? ' is-on' : ''}`}
                 onClick={() => toggleAllDay()}>
            <span className="allday__txt">終日</span>
            <span className="allday__sw" />
          </label>
        </div>
        <DateField value={startAt} onChange={setStartAt} hideTime={allDay} />
      </div>
      <div className="sform__row">
        <label className="sform__label">終了日時</label>
        <DateField value={endAt} onChange={setEndAt} hideTime={allDay} />
      </div>
    </div>
    
    {/* 説明 */}
    <div className="sform__row">
      <label className="sform__label">説明</label>
      <textarea value={description} onChange={setDescription} />
    </div>
    
  </div>
  
  {/* フッター */}
  <div className="sform__footer">
    {!isNew && (
      <Button variant="danger" onClick={handleDelete}>削除</Button>
    )}
    <div className="sform__footer-right">
      <Button variant="subtle" onClick={onCancel}>キャンセル</Button>
      <Button variant="primary" onClick={handleSave} loading={saving}>保存</Button>
    </div>
  </div>
</div>
```

**toggleAllDay ロジック**（双方向）:
```typescript
function toggleAllDay() {
  if (!allDay) {
    // ON にする: 時刻を 00:00 にリセット
    const s = new Date(startAt ?? new Date());
    s.setHours(0, 0, 0, 0);
    const e = new Date(endAt ?? new Date());
    e.setHours(0, 0, 0, 0);
    setStartAt(s); setEndAt(e); setAllDay(true);
  } else {
    // OFF にする: デフォルト時刻を復元
    const s = new Date(startAt ?? new Date());
    s.setHours(21, 0, 0, 0);
    const e = new Date(endAt ?? new Date());
    e.setHours(23, 30, 0, 0);
    setStartAt(s); setEndAt(e); setAllDay(false);
  }
}
```

**保存・削除ハンドラ**:
- 新規: `createSchedule(teamId, { ...data, createdBy: currentUser.uid })` → `onClose()`
- 編集: `updateSchedule(teamId, schedule.id, data, schedule.updatedAt)` → `onClose()`
- 削除: `confirm('この予定を削除しますか？')` → `deleteSchedule(teamId, schedule.id)` → `onDeleted()` + `onClose()`

**CSS（既存 schedule.css CSS クラスを流用。globals.css の `.smodal__*`・`.sform__*`・`.allday` は既存定義を使用）**

#### 1-2. ScheduleDetailModal.tsx 削除

`src/components/calendar/ScheduleDetailModal.tsx` を削除する。

#### 1-3. ScheduleForm.tsx 削除

`src/components/calendar/ScheduleForm.tsx` を削除する。

#### 1-4. schedule/page.tsx 更新

**import 変更**:
```typescript
// 削除
import { ScheduleDetailModal } from '@/components/calendar/ScheduleDetailModal';
import { ScheduleForm } from '@/components/calendar/ScheduleForm';
// 追加
import { ScheduleModal } from '@/components/calendar/ScheduleModal';
```

**状態追加**:
```typescript
const [clickedDate, setClickedDate] = useState<Date | null>(null);
```

**モーダルトリガー変更**:
```typescript
// 予定追加ボタン
onClick={() => { setClickedDate(null); setShowCreate(true); }}

// セルクリック時
onDateClick={canEdit ? (d) => { setClickedDate(d); setShowCreate(true); } : undefined}
```

**レンダリング変更**:
```tsx
{/* チーム予定の追加・編集（統合モーダル） */}
{(showCreate || (selectedSchedule && !selectedSchedule.source)) && currentTeamId && (
  <ScheduleModal
    schedule={showCreate ? null : selectedSchedule}
    initialDate={clickedDate ?? undefined}
    teamId={currentTeamId}
    canEdit={canEdit}
    categories={categories}
    onClose={() => { setShowCreate(false); setSelectedSchedule(null); setClickedDate(null); }}
    onDeleted={() => setSelectedSchedule(null)}
  />
)}
```

**削除**: 旧 `<Modal open={showCreate}>/<ScheduleForm>` ブロック  
**削除**: `handleCreateSchedule` 関数（ScheduleModal 内部に移動）

---

## Sprint 2: ホバー挙動・カラー修正（US6・US7）

### 変更内容

#### 2-1. Avatar.tsx — ds-avatar クラス追加

```typescript
// 変更前
<div className={`relative inline-flex items-center ... ${wrap} ${bgClass}`}>

// 変更後
<div className={`ds-avatar relative inline-flex items-center ... ${wrap} ${bgClass}`}>
```

これで `globals.css` の `.ds-avatar:hover { animation: hop 0.55s var(--ease-out); cursor: pointer; }` が発火する。

#### 2-2. globals.css — ボタンホバー確認・補完

確認事項:
- `.btn--primary:hover { background: var(--pink); ... }` ✅ 定義済み
- `.btn--ghost:hover { ... pink ... }` ✅ 定義済み
- `.btn--subtle:hover { ... pink ... }` ✅ 定義済み

必要に応じて `.btn--icon:hover` のホバー色を追加する。

#### 2-3. DESIGN.md — 色定義追記

`docs/DESIGN.md` に以下を追記:

```yaml
# ピンクホバーアクセント（ボタン hover 時のカラーシフト）
pink:      '#ec4f95'
pink-300:  '#ff9ec6'
pink-700:  '#c93576'
pink-900:  '#5a1c3a'
pink-dim:  'rgba(236,79,149,0.15)'
glow-pink: '0 0 18px rgba(236,79,149,0.5)'

# カード境界線（primary色と border の混合）
card-border:        'color-mix(in oklab, #534ab7 52%, #2a2a55)'
card-border-raised: 'color-mix(in oklab, #7f77dd 48%, #3a3a6a)'
```

---

## 受け入れ基準チェックリスト（Evaluator 向け）

### Sprint 1: 統合モーダル
- [ ] 「予定を追加」ボタンクリック → 「予定を追加」ヘッダーの870px モーダルが開く
- [ ] カレンダーセルクリック → 選択した日付が入力された状態でモーダルが開く
- [ ] 既存予定カードクリック → 「予定を編集」ヘッダーでデータが入力済みのモーダルが開く
- [ ] 新規追加モーダルのフッターに「削除」ボタンが表示されない
- [ ] 編集モーダルのフッターに「削除」ボタンが表示される
- [ ] 終日トグルクリック（OFF→ON）: 時刻欄が非表示になり startAt/endAt が 00:00 になる
- [ ] 終日トグルクリック（ON→OFF）: 時刻欄が再表示され startAt が 21:00、endAt が 23:30 になる
- [ ] 「保存」クリック後にモーダルが閉じ、カレンダーに予定が表示される
- [ ] 「削除」クリック後に確認ダイアログ → 予定が削除される
- [ ] `ScheduleDetailModal.tsx` と `ScheduleForm.tsx` が削除されている
- [ ] TypeScript エラー 0 件

### Sprint 2: ホバー・カラー
- [ ] Avatar をホバーすると hop アニメーション（上バウンス）が発火する
- [ ] Badge をホバーすると hop アニメーションが発火する
- [ ] Primary ボタンをホバーすると背景がピンク (#ec4f95) に変化する
- [ ] DESIGN.md にピンク色とカード境界線の定義が追記されている

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| コメントスレッド・ドラッグ移動を ScheduleModal に移植（T043） | spec.md FR-024（v2 2026-05-31 更新）でユーザー要求として明確に指定された。既存 ScheduleDetailModal に実装済みの機能を引き継ぐことで UX 継続性を確保する | 新規実装として省略 → ユーザーが編集時に依存している既存機能の消失になるため却下 |

---

## 参考: デザインファイルとの対応（v2）

| デザインコンポーネント | 実装ファイル |
|---|---|
| `ScheduleModal` (schedule-pc.jsx) | `src/components/calendar/ScheduleModal.tsx` (新規) |
| `DetailForm` (schedule-pc.jsx) | ScheduleModal 内の内部コンポーネント |
| `allday` toggle (schedule-pc.jsx) | ScheduleModal の toggleAllDay 関数（双方向） |
| `.ds-avatar:hover` (globals.css) | `src/components/ui/Avatar.tsx` に `ds-avatar` クラス追加 |
| `.btn--primary:hover → pink` (globals.css) | 既存定義確認・補完 |
