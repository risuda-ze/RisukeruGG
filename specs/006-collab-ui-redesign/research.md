# Research: コラボ調整画面 UI リデザイン

## 1. モーダルリサイズバグの原因と修正方法

**Decision**: `useRef` で mousedown 発生元を記録し、overlay の click ハンドラで比較する  
**Rationale**: CSS `resize: both` でドラッグ操作すると mousedown がモーダル内で発生し mouseup がオーバーレイ上で発生するため、ブラウザが overlay に click イベントを発火させる。`e.target === e.currentTarget` チェックだけでは不十分（mousedown→mouseup で target が変わるケース）。mousedown 開始位置を ref で記録し、click 時に確認する方法が最も確実。  
**Implementation**:
```tsx
const mouseDownOnOverlay = useRef(false);
// overlay div:
onMouseDown={(e) => { mouseDownOnOverlay.current = e.target === e.currentTarget; }}
onClick={(e) => { if (mouseDownOnOverlay.current) onClose(); }}
```

## 2. 3 ステップレイアウトのアプローチ

**Decision**: シングルコンポーネント内で `currentStep` state を持ち、PC では CSS Grid 3 カラムで全ステップを常時表示、モバイルでは step ナビで切り替え  
**Rationale**: PC では全ステップを俯瞰できる方がUXが良い。モバイルでは画面幅が限られるため逐次表示が適切。`md:` ブレークポイント（768px）で切り替える。  
**Alternatives considered**: 別ページへの遷移（URL変更が必要で複雑）、ステッパーコンポーネント（追加ライブラリ不要）

## 3. 確定コラボセクションの配置

**Decision**: `collabs/page.tsx` の中央カラム（`flex-1`）に open セクションと confirmed セクションを縦に並べる  
**Rationale**: 既存の右サイドバー（フォーム）との 2 カラムレイアウトを維持しつつ、中央に 2 セクションを積み重ねる。confirmed カードは `reopenCollabSession` で再調整可能（Cloud Function 実装済み）。

## 4. 再調整ボタンのスコープ

**Decision**: confirmed カードに直接「再調整する」ボタンを置き、confirm ダイアログを inline で実装  
**Rationale**: CollabDetailModal を開かずとも再調整できる UX。確認ダイアログは `window.confirm` ではなく inline UI で実装（ユーザーが指示した仕様）。

## 5. 既存の Cloud Function 活用

- `reopenCollabSession`: confirmed → open に戻し、linkedScheduleId のスケジュールを削除（実装済み）
- `confirmCollabDate`: スケジュールを自動作成（実装済み）
- 新規 Cloud Function の追加不要
