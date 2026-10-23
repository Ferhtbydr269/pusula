"use client";

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { clamp } from "@/lib/utils";

interface WaterGlassesProps {
  value: number;
  goal: number;
  onChange(next: number): void;
  size?: "sm" | "md";
  /** Hedefi aşan bardaklar da gösterilsin mi (şeritte yer yok, panelde var). */
  showOverflow?: boolean;
}

const MAX_GLYPHS = 12;

/** Dolan bardak: alttan yukarı yükselen su, hafif eğimli gövde. */
function Glass({
  filled,
  size,
  reduce,
}: {
  filled: boolean;
  size: "sm" | "md";
  reduce: boolean | null;
}) {
  const w = size === "sm" ? 9 : 16;
  const h = size === "sm" ? 13 : 22;
  const clipId = useId();

  return (
    <svg width={w} height={h} viewBox="0 0 16 22" className="overflow-visible">
      <defs>
        <clipPath id={clipId}>
          <path d="M3 2 L13 2 L11.6 19.2 Q11.5 20.6 10.1 20.6 L5.9 20.6 Q4.5 20.6 4.4 19.2 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="16" height="22" fill="var(--surface-sunk)" />
        <motion.rect
          x="0"
          width="16"
          fill="var(--cat-petrol)"
          initial={false}
          animate={{ y: filled ? 2 : 22, height: filled ? 20 : 0 }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          }
          opacity={0.85}
        />
      </g>
      <path
        d="M3 2 L13 2 L11.6 19.2 Q11.5 20.6 10.1 20.6 L5.9 20.6 Q4.5 20.6 4.4 19.2 Z"
        fill="none"
        stroke={filled ? "var(--cat-petrol)" : "var(--rule-strong)"}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WaterGlasses({
  value,
  goal,
  onChange,
  size = "md",
  showOverflow = true,
}: WaterGlassesProps) {
  const reduce = useReducedMotion();
  const glyphs = clamp(goal, 1, MAX_GLYPHS);
  const overflow = showOverflow ? Math.max(0, value - glyphs) : 0;

  return (
    <div className="flex items-end gap-2">
      <div
        className={size === "sm" ? "flex items-end gap-[3px]" : "flex items-end gap-1.5"}
        role="group"
        aria-label={`Su: ${value} / ${goal} bardak`}
      >
        {Array.from({ length: glyphs }, (_, i) => {
          const filled = i < value;
          return (
            <button
              key={i}
              type="button"
              // Dolu olan son bardağa basmak geri alır; böylece − düğmesi aramaya gerek yok.
              onClick={() => onChange(filled && i === value - 1 ? i : i + 1)}
              aria-label={`${i + 1}. bardak`}
              aria-pressed={filled}
              className="rounded-[3px] transition-transform duration-150 hover:scale-110 focus-visible:outline-offset-1"
            >
              <Glass filled={filled} size={size} reduce={reduce} />
            </button>
          );
        })}
      </div>
      {overflow > 0 && (
        <span className="numerals text-sm text-muted">+{overflow}</span>
      )}
    </div>
  );
}
