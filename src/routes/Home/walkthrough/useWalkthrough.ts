import { useEffect, useState } from "react";

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
export function useWalkthroughStep(stepCount: number, reduced: boolean): number {
  const last = Math.max(0, stepCount - 1);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (reduced || stepCount < 2) {
      setStep(last);
      return;
    }
    setStep(0);
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % stepCount);
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, [reduced, stepCount, last]);

  return reduced ? last : step;
}
