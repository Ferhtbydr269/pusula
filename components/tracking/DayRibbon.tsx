"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplet, Footprints, SlidersHorizontal, StickyNote } from "lucide-react";
import type { DailyTracking, ISODate, Mood, Settings } from "@/lib/data/types";
import { clamp, cn } from "@/lib/utils";
import { WaterGlasses } from "./WaterGlasses";

/**
 * Şeritte bardak çizmiyoruz: 9 piksellik bir bardak barkoda dönüşüyor.
 * Sayılabilir şeyler burada nokta — erteleme haklarıyla aynı dil.
 * Dolan bardak animasyonu günlük takip panelinde, yeri olan yerde.
 */
function WaterDots({
  value,
  goal,
  onChange,
}: {
  value: number;
  goal: number;
  onChange(next: number): void;
}) {
  const slots = clamp(goal, 1, 10);
  return (
    <div
      className="flex items-center gap-[3px]"
      role="group"
      aria-label={`Su: ${value} / ${goal} bardak`}
    >
      {Array.from({ length: slots }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1}. bardak`}
            aria-pressed={filled}
            onClick={() => onChange(filled && i === value - 1 ? i : i + 1)}
            className="grid size-3 place-items-center rounded-full transition-transform duration-150 hover:scale-125"
          >
            <span
              className={cn(
                "size-[6px] rounded-full transition-colors duration-200",
                filled
                  ? "bg-[var(--cat-petrol)]"
                  : "border border-rule-strong bg-transparent",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export const MOODS: Array<{ value: Mood; emoji: string; label: string }> = [
  { value: 1, emoji: "😔", label: "Kötü" },
  { value: 2, emoji: "😐", label: "İdare eder" },
  { value: 3, emoji: "🙂", label: "İyi" },
  { value: 4, emoji: "😄", label: "Çok iyi" },
  { value: 5, emoji: "🤩", label: "Harika" },
];

function MoodButton({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange(next: Mood | null): void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = MOODS.find((m) => m.value === value);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={current ? `Ruh hali: ${current.label}` : "Ruh hali seç"}
        aria-expanded={open}
        className={cn(
          "grid size-5 place-items-center rounded-full text-[13px] leading-none transition-colors",
          current ? "hover:bg-sunk" : "border border-dashed border-rule-strong hover:border-ink/40",
        )}
      >
        {current?.emoji ?? ""}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 gap-0.5 rounded-lg border border-rule bg-raised p-1 shadow-lift"
          >
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                title={m.label}
                aria-label={m.label}
                onClick={() => {
                  onChange(value === m.value ? null : m.value);
                  setOpen(false);
                }}
                className={cn(
                  "grid size-7 place-items-center rounded-md text-base transition-transform duration-150 hover:scale-110 hover:bg-sunk",
                  value === m.value && "bg-quince-wash",
                )}
              >
                {m.emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface DayRibbonProps {
  date: ISODate;
  tracking: DailyTracking;
  settings: Settings;
  onTracking(date: ISODate, patch: Partial<DailyTracking>): void;
  onOpen(): void;
  today: boolean;
  /** Mobilde şerit daha ferah dizilebilir. */
  roomy?: boolean;
}

export function DayRibbon({
  date,
  tracking,
  settings,
  onTracking,
  onOpen,
  today,
  roomy = false,
}: DayRibbonProps) {
  const { tracking: on, goals } = settings;
  const anyEnabled = Object.values(on).some(Boolean);
  if (!anyEnabled) return null;

  const waterReached = on.water && tracking.waterGlasses >= goals.water;
  const compactWater = goals.water > 10 && !roomy;

  return (
    <div
      className={cn(
        "shrink-0 border-t px-2.5 pt-2 pb-2.5",
        today ? "border-today-edge" : "border-rule",
      )}
    >
      {on.water && (
        <div className="flex min-h-[15px] items-center gap-1.5">
          {compactWater ? (
            <button
              type="button"
              onClick={() => onTracking(date, { waterGlasses: tracking.waterGlasses + 1 })}
              className="flex items-center gap-1 rounded px-1 py-0.5 text-2xs text-muted transition-colors hover:bg-sunk hover:text-ink"
              aria-label={`Su: ${tracking.waterGlasses} / ${goals.water} bardak, bir bardak ekle`}
            >
              <Droplet
                size={11}
                strokeWidth={1.75}
                className={waterReached ? "text-[var(--cat-petrol)]" : ""}
              />
              <span className="numerals">
                {tracking.waterGlasses}/{goals.water}
              </span>
            </button>
          ) : roomy ? (
            <WaterGlasses
              value={tracking.waterGlasses}
              goal={goals.water}
              size="md"
              onChange={(next) => onTracking(date, { waterGlasses: next })}
            />
          ) : (
            <WaterDots
              value={tracking.waterGlasses}
              goal={goals.water}
              onChange={(next) => onTracking(date, { waterGlasses: next })}
            />
          )}
          {waterReached && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 18 }}
              className="text-2xs text-[var(--cat-petrol)]"
              title="Su hedefi tamam"
            >
              ✓
            </motion.span>
          )}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1.5">
        {on.mood && (
          <MoodButton
            value={tracking.mood}
            onChange={(mood) => onTracking(date, { mood })}
          />
        )}

        {on.movement && tracking.movementMin > 0 && (
          <span
            className="flex items-center gap-0.5 text-2xs text-muted"
            title={`Hareket: ${tracking.movementMin} dakika`}
          >
            <Footprints size={11} strokeWidth={1.75} />
            <span className="numerals">{tracking.movementMin}</span>
          </span>
        )}

        {on.note && tracking.note.trim() && (
          <span className="text-faint" title={tracking.note}>
            <StickyNote size={11} strokeWidth={1.75} />
          </span>
        )}

        <button
          type="button"
          onClick={onOpen}
          aria-label="Günlük takibi aç"
          title="Günlük takip"
          className="ml-auto rounded p-1 text-faint transition-colors hover:bg-sunk hover:text-ink"
        >
          <SlidersHorizontal size={12} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}
