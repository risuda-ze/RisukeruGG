# Feature Spec: ユーザー管理修正（ロール名・削除保持・PlanStatus）

**Branch**: `007-user-management-fixes` | **Date**: 2026-05-20

## Overview

仕様審査で判明した3件のユーザー管理ギャップを修正する。ロール名称をコードと仕様で一致させ、アカウント削除後も表示情報を保持し、PlanStatusコンポーネントを実データに接続する。

## Clarifications

### Session 2026-05-20

- Q: ROM専のコード値（TypeScript/Firestore）は何にするか？ → A: `'rom'`（`'viewer'` から変更）
- Q: UI 上のロール表示言語は？ → A: 日本語（オペレーター・メンバー・ROM専）

---

## 修正項目

### 1. チーム内ロール名称の統一

**現状**: TypeScript の `UserRole` 型と Firestore 保存値が `'owner' | 'editor' | 'viewer'` だが、仕様では以下の名称を定義している。

| 仕様の名称 | 現在の実装値 | 新コード値 |
|---|---|---|
| オペレーター（最上位権限） | `'owner'` | `'operator'` |
| メンバー（編集権限） | `'editor'` | `'member'` |
| ROM専（閲覧専用） | `'viewer'` | `'rom'` |

**変更後**:
- `UserRole = 'operator' | 'member' | 'rom'`
- Firestore 既存ドキュメントの後方互換読み取り（`'owner'` → `'operator'`、`'editor'` → `'member'`、`'viewer'` → `'rom'`）
- `validateAuth.ts` の `requireOwner()` → `requireOperator()`、`requireOwnerOrEditor()` → `requireOperatorOrMember()`
- UI 表示ラベルは日本語（オペレーター・メンバー・ROM専）

**制約**:
- オペレーターはチームに必ず1人（現行の owner 1人制約を維持）
- Firestore 既存データは読み取り時に変換。書き込み時から新値を使用（移行期は旧値読み取り対応）

---

### 2. アカウント削除後のユーザー情報保持

**現状**: `deleteAccount` Cloud Function が `users/{uid}` ドキュメントを完全削除するため、削除済みユーザーの表示名・アイコンがアプリ内から消える。

**変更後**:
- `users/{uid}` ドキュメントを削除せず、"ゴースト"状態に変更する
- 保持フィールド: `uid`, `displayName`, `avatarUrl`, `deleted: true`, `deletedAt`
- 削除フィールド: `email`, `fcmTokens`, `googleCalendar`, `notificationPreferences`, `plan`, `teamIds`, その他個人情報
- Firebase Auth アカウントの削除は変わらず実施（再ログイン不可）
- `User` 型に `deleted?: boolean` と `deletedAt?: Date | null` を追加

**影響範囲**:
- `deleteAccount.ts` の `tx.delete(users/{uid})` → `tx.set(users/{uid}, ghostData)`
- `User` エンティティ型の拡張

---

### 3. PlanStatus のプラン取得を実データに接続

**現状**: `src/components/plan/PlanStatus.tsx` の `isLight` が `true` にハードコードされており、実際のユーザープランが反映されない。

**変更後**:
- `useAuthStore` の `members` から現在ユーザーのプランを取得
- `myMember?.plan !== 'party'` を `isLight` の判定に使用

---

## スコープ外

- Firestore Security Rules の変更（既存ルールはロール値の文字列比較をしないため不要）
- Firestore 既存データの一括マイグレーション（後方互換読み取りで対応）
- 削除済みユーザーの表示 UI 最適化（名前の後に「（退会済み）」表示など）
