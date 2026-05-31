# Data Model: UIリデザイン v2

このフィーチャーはUIリデザインが主体であり、新規データモデルの追加はない。
既存の `ScheduleEntry`・`ScheduleCategory` 型を変更せず再利用する。

---

## 変更コンポーネント Props インターフェース

### ScheduleModal（新規 — ScheduleForm + ScheduleDetailModal を統合）

```typescript
// src/components/calendar/ScheduleModal.tsx
interface ScheduleModalProps {
  /** null のとき新規追加モード、ScheduleEntry のとき編集モード */
  schedule: ScheduleEntry | null;
  /** 初期日付（セルクリック時にセットする日付） */
  initialDate?: Date;
  teamId: string;
  canEdit: boolean;
  categories: ScheduleCategory[];
  onClose: () => void;
  /** 削除完了時のコールバック */
  onDeleted: () => void;
}
```

**新規追加時（schedule=null）**:
- モーダルヘッダー: 「予定を追加」
- フッター: 削除ボタン非表示
- 保存ハンドラ: `createSchedule()` 呼び出し

**編集時（schedule=ScheduleEntry）**:
- モーダルヘッダー: 「予定を編集」
- フッター: 削除ボタン表示
- 保存ハンドラ: `updateSchedule()` 呼び出し
- 削除ハンドラ: `deleteSchedule()` 呼び出し + `onDeleted()` + `onClose()`

---

### DetailForm（ScheduleModal内の純UIフォーム）

```typescript
// ScheduleModal.tsx 内の内部コンポーネント（エクスポート不要）
interface DetailFormProps {
  schedule: ScheduleEntry | null;  // null=新規
  categories: ScheduleCategory[];
  onCancel: () => void;
  onSave: (data: ScheduleFormData) => Promise<void>;
  onDelete?: () => Promise<void>;   // undefined=新規（削除ボタン非表示）
  saving?: boolean;
  error?: string | null;
}

interface ScheduleFormData {
  title: string;
  categoryId: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  description: string;
}
```

---

### AllDay トグルの状態変化

```
allDay=false → クリック → allDay=true
  - startAt の時刻を 00:00:00 にリセット
  - endAt の時刻を 00:00:00 にリセット
  - DateField の hideTime=true → 時刻欄非表示

allDay=true → クリック → allDay=false
  - startAt の時刻を デフォルト（例: 21:00）に復元
  - endAt の時刻を デフォルト（例: 23:30）に復元
  - DateField の hideTime=false → 時刻欄表示
```

---

### Avatar コンポーネント変更

```typescript
// src/components/ui/Avatar.tsx
// 変更: root div に 'ds-avatar' クラスを追加
// 変更前: className={`relative inline-flex ... ${wrap} ${bgClass}`}
// 変更後: className={`ds-avatar relative inline-flex ... ${wrap} ${bgClass}`}
```

これにより `globals.css` の `.ds-avatar:hover { animation: hop 0.55s ... }` が発火する。

---

## schedule/page.tsx の変更

現在の状態:
```tsx
// 新規追加: Modal + ScheduleForm
<Modal open={showCreate} onClose={() => setShowCreate(false)} title="スケジュールを追加">
  <ScheduleForm categories={categories} onSubmit={handleCreateSchedule} onCancel={() => setShowCreate(false)} />
</Modal>

// 編集: ScheduleDetailModal
{selectedSchedule && !selectedSchedule.source && currentTeamId && (
  <ScheduleDetailModal schedule={selectedSchedule} ... />
)}
```

変更後:
```tsx
// 新規追加 & 編集: 統合 ScheduleModal
{(showCreate || selectedSchedule) && currentTeamId && (
  <ScheduleModal
    schedule={selectedSchedule?.source ? null : selectedSchedule}
    initialDate={clickedDate}
    teamId={currentTeamId}
    canEdit={canEdit}
    categories={categories}
    onClose={() => { setShowCreate(false); setSelectedSchedule(null); }}
    onDeleted={() => setSelectedSchedule(null)}
  />
)}
```

注意: `selectedSchedule?.source` が `'google'` や `'member'` の場合は旧来の読み取り専用ポップアップを継続使用する（`ScheduleModal` は チーム予定 のみ）。

---

## DESIGN.md 追記項目

以下の色定義を `docs/DESIGN.md` に追記:

```yaml
# ホバーアクセント（ボタン ホバー時のピンクシフト）
pink:      '#ec4f95'
pink-300:  '#ff9ec6'
pink-700:  '#c93576'
pink-900:  '#5a1c3a'
pink-dim:  'rgba(236,79,149,0.15)'
glow-pink: '0 0 18px rgba(236,79,149,0.5)'

# カード境界線（プライマリ色混合）
card-border:        'color-mix(in oklab, #534ab7 52%, #2a2a55)'
card-border-raised: 'color-mix(in oklab, #7f77dd 48%, #3a3a6a)'
```
