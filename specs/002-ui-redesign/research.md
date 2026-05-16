# Research: UIリデザイン — チケット002

**Feature**: 002-ui-redesign  
**Date**: 2026-05-16

---

## R-001: Material Icons 統合方法

**Decision**: Google Fonts CDN リンクを `src/app/layout.tsx` に直接追加  
**Rationale**: `next/font/google` はアイコンフォント非対応。CDN リンク1行で済むため導入コストが最小  
**Alternatives considered**: `@material-icons/font` npm（バンドル ~3MB で過大）、`@material-ui/icons`（MUI 依存で過大）

**実装**:

```tsx
// src/app/layout.tsx — <html> の直前または <body> 内に追加
<link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
```

**使用方法**:

```tsx
// Material Icons はクラス名 "material-icons" で span 要素を使う
<span className="material-icons text-[20px]">calendar_month</span>
```

---

## R-002: Azouaoui Mohamed サイドバーパターン

**Decision**: `docs/risukeru_gg_screens.html` の実装をそのまま TypeScript/Tailwind に移植する

**参照実装のキー仕様** (`risukeru_gg_screens.html` より):

- `.sidebar { width: 260px }` / `.sidebar.collapsed { width: 72px }`
- `.sidebar-dropdown > a` クリックで `.sidebar-submenu` を `display: block` 切り替え
- `.sidebar-dropdown.active .arrow { transform: rotate(90deg) }` でシェブロン回転
- `logo-icon` クリックで `switchScreen('dashboard')` → Next.js では `router.push('/dashboard')`

**Tailwind 移植方針**:

- `w-[260px]` → `w-[72px]`、`transition-[width] duration-300` でスムーズアニメーション
- アコーディオン: `openSections` 配列で開いているセクションを管理
- 折りたたみ時のテキスト非表示: `collapsed` 時に `hidden` class を付与

---

## R-003: Zustand persist 使用方法

**Decision**: `zustand/middleware` の `persist` で `localStorage` に保存

**既存ストア確認** (`src/stores/auth.ts` 等):

- 既存ストアは `persist` を使用していない
- sidebar.ts のみ `persist` を採用（folded state は UX 上重要）

**実装パターン**:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      openSections: ['メイン'],
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      toggleSection: (label) =>
        set((s) => ({
          openSections: s.openSections.includes(label)
            ? s.openSections.filter((l) => l !== label)
            : [...s.openSections, label],
        })),
      openSection: (label) =>
        set((s) => ({
          openSections: s.openSections.includes(label)
            ? s.openSections
            : [...s.openSections, label],
        })),
    }),
    { name: 'risukeru-sidebar' }
  )
);
```

---

## R-004: 通知ドロップダウン外クリック閉じる実装

**Decision**: `useRef` + `useEffect` で `document.mousedown` をリッスン

```typescript
const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!open) return;
  const handler = (e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      onClose();
    }
  };
  document.addEventListener('mousedown', handler);
  return () => document.removeEventListener('mousedown', handler);
}, [open, onClose]);
```

---

## R-005: ダッシュボードの「今月の動画投稿数」データ

**Decision**: フェーズ1では `tasks.filter(t => t.category === 'editing').length` を使用し、ラベルを「編集タスク数」と表示する

**Rationale**:

- `ScheduleEntry` に `type` フィールド（配信 vs 動画投稿）が存在しない
- 動画制作の代理指標として「編集」カテゴリのタスク件数が最も近い
- フェーズ2でのデータモデル拡張まで暫定実装とし、コメントで明記する
