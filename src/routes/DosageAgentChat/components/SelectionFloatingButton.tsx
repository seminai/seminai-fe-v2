import { useState, useRef, useEffect } from "react";
import { TextSelect } from "lucide-react";

export function SelectionFloatingButton({
  containerRef,
  onAddContext,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onAddContext: (text: string) => void;
}) {
  const [selectionInfo, setSelectionInfo] = useState<{
    text: string;
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleMouseUp = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (
          !selection ||
          selection.isCollapsed ||
          !selection.toString().trim()
        ) {
          return;
        }
        const container = containerRef.current;
        if (!container) return;
        const range = selection.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) return;
        const rect = range.getBoundingClientRect();
        setSelectionInfo({
          text: selection.toString().trim(),
          top: rect.bottom + 6,
          left: Math.max(8, Math.min(rect.left, window.innerWidth - 200)),
        });
      }, 10);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setSelectionInfo(null);
      }
    };

    const handleScroll = () => setSelectionInfo(null);

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    const container = containerRef.current;
    const viewport = container?.closest("[data-slot='scroll-area-viewport']");
    viewport?.addEventListener("scroll", handleScroll);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      viewport?.removeEventListener("scroll", handleScroll);
    };
  }, [containerRef]);

  if (!selectionInfo) return null;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => {
        onAddContext(selectionInfo.text);
        setSelectionInfo(null);
        window.getSelection()?.removeAllRanges();
      }}
      style={{
        position: "fixed",
        top: selectionInfo.top,
        left: selectionInfo.left,
        zIndex: 9999,
      }}
      className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-lg hover:bg-slate-50 hover:border-emerald-300 transition-colors animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <TextSelect className="h-3.5 w-3.5 text-emerald-600" />
      Aggiungi al contesto
    </button>
  );
}
