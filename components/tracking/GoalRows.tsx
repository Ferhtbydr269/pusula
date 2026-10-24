"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Check, Droplet, Footprints, Moon, Target } from "lucide-react";
import type {
  DailyTracking,
  NumericTrackingKey,
  Settings,
} from "@/lib/data/types";
import { formatPair, goalsForDay } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";

const ICONS: Record<NumericTrackingKey, typeof Droplet> = {
  water: Droplet,
  movement: Footprints,
  sleep: Moon,
  reading: BookOpen,
  focus: Target,
};

interface GoalRowsProps {
  tracking: DailyTracking;
  settings: Settings;
  onOpen(): void;
  dimmed?: boolean;
}

/**
 * Günün hedefleri, görevlerin hemen altında. Görev değiller: kutucukları yok,
 * elle işaretlenmezler — sayaç hedefi geçince kendileri tamamlanır. Satıra
 * dokunmak günlük takip panelini açar, böylece takip aranmadan bulunuyor.
 */
export function GoalRows({ tracking, settings, onOpen, dimmed }: GoalRowsProps) {
  const reduce = useReducedMotion();
  const goals = goalsForDay(tracking, settings);
  if (!goals.length) return null;

  return (
    <div className={cn("mt-1.5 border-t border-rule/70 pt-1.5", dimmed && "opacity-80")}>
      {goals.map(({ metric, value, goal, reached }) => {
        const Icon = ICONS[metric.key];
        const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
        return (
          <button
            key={metric.key}
            type="button"
            onClick={onOpen}
            title={`${metric.label}: ${metric.format(value)} / ${metric.format(goal)} — günlük takibi aç`}
            className="group/goal flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-raised"
          >
            {reached ? (
              <motion.span
                initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="grid size-[18px] shrink-0 place-items-center rounded-full border border-moss bg-moss text-surface"
              >
                <Check size={11} strokeWidth={3} />
              </motion.span>
            ) : (
              <span className="relative grid size-[18px] shrink-0 place-items-center">
                <Ring value={ratio} size={18} thickness={2} />
                <Icon
                  size={9}
                  strokeWidth={2}
                  className="absolute text-faint"
                  aria-hidden
                />
              </span>
            )}

            {/* İlerleme artık yatay çubukla değil halkayla gösteriliyor:
                tam genişlik çubuk, sayfanın kendi çizgileriyle aynı şeye
                benziyordu ve görevler bu çizgilerin arasında kayboluyordu. */}
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate text-xs transition-colors",
                  reached ? "text-faint" : "text-muted",
                )}
                style={reached ? { textDecorationLine: "line-through" } : undefined}
              >
                {metric.label}
              </span>
              <span
                className={cn(
                  "numerals shrink-0 text-2xs",
                  reached ? "text-moss" : "text-faint",
                )}
              >
                {formatPair(metric, value, goal)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
