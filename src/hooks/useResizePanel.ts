import { useCallback, useEffect, useState } from "react";

export interface UseResizePanelOptions {
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  storageKey?: string;
}

function readStoredWidth(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(key);
    if (v === null) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function writeStoredWidth(key: string, width: number): void {
  try {
    localStorage.setItem(key, String(width));
  } catch {
    // ignore
  }
}

export function useResizePanel({
  defaultWidth,
  minWidth,
  maxWidth,
  storageKey,
}: UseResizePanelOptions): {
  width: number;
  setWidth: (w: number) => void;
  isResizing: boolean;
  getResizeHandlers: () => {
    onMouseDown: (e: React.MouseEvent) => void;
  };
} {
  const [width, setWidthState] = useState<number>(() => {
    if (storageKey) {
      const stored = readStoredWidth(storageKey);
      if (stored !== null && stored >= minWidth && stored <= maxWidth) return stored;
    }
    return defaultWidth;
  });
  const [isResizing, setIsResizing] = useState(false);

  const setWidth = useCallback(
    (w: number) => {
      const clamped = Math.min(maxWidth, Math.max(minWidth, w));
      setWidthState(clamped);
      if (storageKey) writeStoredWidth(storageKey, clamped);
    },
    [minWidth, maxWidth, storageKey]
  );

  const getResizeHandlers = useCallback(() => ({
    onMouseDown: (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setIsResizing(true);
    },
  }), []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setWidth(newWidth);
    };
    const onUp = () => setIsResizing(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onUp);
    };
  }, [isResizing, setWidth]);

  return { width, setWidth, isResizing, getResizeHandlers };
}
