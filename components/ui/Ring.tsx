"use client";

import { motion, useReducedMotion } from "framer-motion";

interface RingProps {
  /** 0–1 arası tamamlanma oranı. */
  value: number;
  size?: number;
  thickness?: number;
  /** Hiç görev yoksa halka kesikli çizilir — "boş" ile "hiç yapılmamış" ayrışsın. */
  empty?: boolean;
  label?: string;
}

export function Ring({
  value,
  size = 22,
  thickness = 2.5,
  empty = false,
  label,
}: RingProps) {
  const reduce = useReducedMotion();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={label ? "img" : "presentation"}
      aria-label={label}
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--rule-strong)"
        strokeWidth={thickness}
        strokeDasharray={empty ? "1.5 3" : undefined}
        strokeLinecap="round"
        opacity={empty ? 0.75 : 0.5}
      />
      {!empty && clamped > 0 && (
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--quince)"
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </svg>
  );
}
