'use client';

import { useState, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';

/**
 * モーダルをヘッダードラッグで移動させるためのフック（PC のみ想定）。
 * 返り値の position を transform に、handleDragStart をドラッグハンドルの
 * onMouseDown に渡して使う。フォーム要素・リンク上からのドラッグ開始は無視する。
 */
export function useModalDrag() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return;
      setPosition({
        x: dragStart.current.posX + e.clientX - dragStart.current.mouseX,
        y: dragStart.current.posY + e.clientY - dragStart.current.mouseY,
      });
    }
    function onUp() { isDragging.current = false; }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, []);

  function handleDragStart(e: ReactMouseEvent) {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    isDragging.current = true;
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, posX: position.x, posY: position.y };
    e.preventDefault();
  }

  return { position, handleDragStart };
}
