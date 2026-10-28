import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "./walkthrough/useWalkthrough";

/**
 * Cycles an index every `intervalMs`. Stops for reduced motion and once the
 * visitor picks an item by hand (`select`).
 */
export function useAutoAdvance(count: number, intervalMs: number) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (reduced || manual || count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [reduced, manual, count, intervalMs]);

  const select = (next: number) => {
    setManual(true);
    setIndex(next);
  };

  return { index, select };
}
