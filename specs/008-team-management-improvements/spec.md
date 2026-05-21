# Feature Spec: チーム管理改善・ナビ修正

**Branch**: `008-team-management-improvements` | **Date**: 2026-05-21

## Overview

3件のバグを修正する。チーム移動後のソロチーム自動削除・チーム管理画面への退出UI追加・サイドバーの多重アクティブ状態バグの解消。

---

## 修正項目

### 1. ソロチーム自動削除（チーム移動時）

**現状**: ユーザーが別チームに参加後、元のソロチーム（自分だけのチーム）から脱退しようとすると
「先に別のメンバーをオペレーターに指名してください」エラーが発生する。
`leaveSpecificTeam` および `leaveTeam` はオペレーターの脱退を一律禁止しているため、
メンバーが1人（自分のみ）のチームでも脱退できない。

**根本原因**:
- `functions/src/teams/leaveSpecificTeam.ts` L32: `if (role === 'operator') throw error`
- `functions/src/teams/leaveTeam.ts` L17: `if (ctx.role === 'operator') throw error`
- メンバー数チェックなしでオペレーターを一律ブロックしている

**変更後**:
- オペレーターがチームを脱退しようとする際、メンバー数を確認する
- メンバーが1人（自分のみ）のソロチームの場合: チームドキュメント・teamCodeドキュメントを削除して脱退を許可
- メンバーが2人以上の場合: 従来どおりエラーを返す（オペレーター移譲必須）
- `removeTeamMember` でメンバー削除後に残メンバー数が0になった場合も同様に削除（防御的処理）

---

### 2. チーム管理画面への「現在のチームから退出する」追加

**現状**: `/team` ページの「チームを脱退する」ボタンは `!isOperator` の条件付きで非表示。
オペレーターにはソロチームであっても退出 UI が存在しない。

**根本原因**:
- `src/app/(protected)/team/page.tsx` L313: `{!isOperator && (...)}`
- オペレーターに対して退出 UI を一切提供していない

**変更後**:
- 退出ボタンを全ロール（オペレーター含む）に表示
- ラベルを「現在のチームから退出する」に統一
- `LeaveTeamDialog.tsx` を更新:
  - ソロチーム（メンバー数 ≤ 1）のオペレーター: 退出ボタンを有効化 → `leaveSpecificTeam` を呼び出す
  - 複数メンバーのオペレーター: 「先に所有権を移譲してください」メッセージ（ボタン無効）
  - 非オペレーター: `leaveSpecificTeam({ teamId })` を呼び出す（`leaveTeam` は `teamIds` を更新しない古い実装のため統一）
- `LeaveTeamDialog` のプロパティを `isOwner: boolean` から `isSoloOperator: boolean` に改名・再定義

---

### 3. サイドバー多重アクティブ状態バグ（個人設定でチャンネル設定も選択）

**現状**: `/settings/profile` ページへ遷移すると、サイドバーで「チャンネル設定 (`/settings`)」と
「個人設定 (`/settings/profile`)」の両方がアクティブハイライトされる。

**根本原因**:
- `src/components/layout/Sidebar.tsx` L143, L180:
  ```typescript
  const active = !item.disabled && pathname.startsWith(item.href);
  ```
- `/settings/profile` は `/settings` の前方一致にもマッチするため、両アイテムが同時にアクティブになる

**変更後**:
- 最長プレフィックス一致を使用: 現在のパスに最も長くマッチするナビアイテムのみをアクティブにする
- `Sidebar.tsx` 内でレンダリング前に `activeHref` を計算:
  ```typescript
  const allNavItems = NAV_SECTIONS.flatMap((s) => s.items);
  const activeHref = allNavItems
    .filter((i) => !i.disabled && (pathname === i.href || pathname.startsWith(i.href + '/')))
    .reduce((longest, i) => (i.href.length > longest.length ? i.href : longest), '');
  ```
- `const active = !item.disabled && item.href === activeHref;` に変更
- 同様の修正を折りたたみ時のアイコンループにも適用

---

## スコープ外

- チーム間メンバー移動 UI（ドラッグ&ドロップ等）
- BottomNav の同様バグ（`/settings/profile` 系アイテムが BottomNav にないため影響なし）
- `leaveTeam.ts` の `leaveSpecificTeam` への**統合・廃止**（T002 はソロチーム対応の個別修正のみであり、2関数の統合・既存 export の削除は本スコープ外）
