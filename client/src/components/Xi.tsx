import { type CSSProperties } from "react";

type XiState = "base" | "active" | "signal";
type XiVariant = "rounded" | "sharp";

type XiProps = {
  state?: XiState;
  variant?: XiVariant;
  size?: number;
  className?: string;
};

const STROKE_BY_STATE: Record<XiState, CSSProperties> = {
  base: {
    color: "hsl(var(--foreground))",
    opacity: 0.88,
  },
  active: {
    color: "hsl(var(--primary))",
    filter: "drop-shadow(0 0 6px color-mix(in oklab, hsl(var(--primary)) 35%, transparent))",
  },
  signal: {
    color: "hsl(var(--secondary))",
    filter: "drop-shadow(0 0 10px color-mix(in oklab, hsl(var(--secondary)) 45%, transparent))",
  },
};

export function Xi({ state = "base", variant = "rounded", size = 28, className }: XiProps) {
  const lineCap = variant === "rounded" ? "round" : "square";
  const pulseClass = state === "base" ? "" : state === "active" ? "xi-pulse-active" : "xi-pulse-signal";

  return (
    <span
      className={["inline-flex items-center justify-center will-change-transform", pulseClass, className].filter(Boolean).join(" ")}
      style={STROKE_BY_STATE[state]}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="20" y1="26" x2="100" y2="26" stroke="currentColor" strokeWidth="12" strokeLinecap={lineCap} />
        <line x1="20" y1="60" x2="100" y2="60" stroke="currentColor" strokeWidth="12" strokeLinecap={lineCap} />
        <line x1="20" y1="94" x2="100" y2="94" stroke="currentColor" strokeWidth="12" strokeLinecap={lineCap} />
      </svg>
    </span>
  );
}
