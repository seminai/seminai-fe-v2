import type { ReactNode } from "react";
import { usePrefersReducedMotion, useWalkthroughStep } from "./useWalkthrough";

export interface CursorStep {
  readonly x: number;
  readonly y: number;
  readonly click?: boolean;
}

interface CursorWalkthroughProps {
  readonly steps: readonly CursorStep[];
  readonly url: string;
  readonly caption: string;
  readonly children: (step: number) => ReactNode;
}

export function CursorWalkthrough({
  steps,
  url,
  caption,
  children,
}: CursorWalkthroughProps) {
  const reduced = usePrefersReducedMotion();
  const step = useWalkthroughStep(steps.length, reduced);
  const current = steps[step];

  return (
    <figure className="walkthrough">
        <div className="demo-frame" aria-hidden="true">
        <div className="demo-bar">
          <span className="dot d1" />
          <span className="dot d2" />
          <span className="dot d3" />
          <span className="demo-url">{url}</span>
        </div>
        <div className="demo-body walkthrough-stage">
          {children(step)}
          {!reduced && current ? (
            <span
              className={`walk-cursor${current.click ? " is-click" : ""}`}
              style={{ left: `${current.x}%`, top: `${current.y}%` }}
              aria-hidden="true"
            >
              <CursorIcon />
            </span>
          ) : null}
        </div>
      </div>
      <figcaption className="demo-caption">{caption}</figcaption>
    </figure>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M5 3l14 8.2-6.2 1.3L11 20.5 5 3z"
        fill="#1A1A1A"
        stroke="#fff"
        strokeWidth="1.2"
      />
    </svg>
  );
}
