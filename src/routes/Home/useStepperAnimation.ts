import { useEffect, useRef, type RefObject } from "react";

export function useStepperAnimation(): RefObject<HTMLDivElement | null> {
  const stepperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stepper = stepperRef.current;
    if (!stepper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            stepper.classList.add("lit");
            observer.unobserve(stepper);
          }
        });
      },
      { threshold: 0.35 },
    );

    observer.observe(stepper);

    return () => {
      observer.disconnect();
    };
  }, []);

  return stepperRef;
}
