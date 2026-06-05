import { cn } from "@/lib/utils";
import { APP_LOGO_URL } from "@/config/brand";

interface SpinnerProps {
  size?: number;
  speed?: "slow" | "normal" | "fast";
  ariaLabel?: string;
  className?: string;
}

class SpinnerModel {
  public readonly size: number;
  public readonly speed: "slow" | "normal" | "fast";
  public readonly ariaLabel: string;

  constructor({
    size = 40,
    speed = "normal",
    ariaLabel = "Loading",
  }: SpinnerProps) {
    this.size = size;
    this.speed = speed;
    this.ariaLabel = ariaLabel;
  }

  public getAnimationDurationMs(): number {
    if (this.speed === "slow") return 1500;
    if (this.speed === "fast") return 600;
    return 1000;
  }
}

function Spinner({
  size = 40,
  speed = "normal",
  ariaLabel = "Loading",
  className,
}: SpinnerProps) {
  const model = new SpinnerModel({ size, speed, ariaLabel });
  return (
    <img
      src={APP_LOGO_URL}
      role="status"
      aria-label={model.ariaLabel}
      alt={model.ariaLabel}
      style={{
        width: model.size,
        height: model.size,
        animationDuration: `${model.getAnimationDurationMs()}ms`,
      }}
      className={cn("inline-block animate-spin", className)}
    />
  );
}

export { Spinner };
