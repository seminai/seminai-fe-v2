import { useEffect, useRef, useState } from "react";

const STEP_MS = 1700;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  return reduced;
}

/** Loops a scene. Reduced motion stays on the finished frame. */
export function useWalkthroughStep(
  stepCount: number,
  reduced: boolean,
  onCycleComplete?: () => void,
  paused = false,
): number {
  const last = Math.max(0, stepCount - 1);
  const [step, setStep] = useState(0);
  const onCycleRef = useRef(onCycleComplete);
  onCycleRef.current = onCycleComplete;

  useEffect(() => {
    if (reduced) {
      setStep(last);
      return;
    }
    if (paused || stepCount < 2) {
      setStep(stepCount < 2 ? last : 0);
      return;
    }
    setStep(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current = (current + 1) % stepCount;
      setStep(current);
      if (current === 0) onCycleRef.current?.();
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, stepCount, last]);

  return reduced ? last : step;
}
