"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, Check, Droplet, Footprints, Moon, Target } from "lucide-react";
import type { DailyTracking, Settings } from "@/lib/data/types";
import { goalsForDay, type NumericTrackingKey } from "@/lib/tracking";
import { cn } from "@/lib/utils";

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
            className="group/goal flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-raised"
          >
            <span
              className={cn(
                "grid size-[18px] shrink-0 place-items-center rounded-full border transition-colors",
                reached
                  ? "border-moss bg-moss text-surface"
                  : "border-rule-strong text-faint",
              )}
            >
              {reached ? (
                <motion.span
                  initial={reduce ? false : { scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="grid place-items-center"
                >
                  <Check size={11} strokeWidth={3} />
                </motion.span>
              ) : (
                <Icon size={10} strokeWidth={2} />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
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
                  {metric.format(value)}
                  <span className="text-faint"> / {metric.format(goal)}</span>
                </span>
              </span>

              <span className="mt-1 block h-[2px] overflow-hidden rounded-full bg-sunk">
                <motion.span
                  className="block h-full rounded-full"
                  style={{ background: reached ? "var(--moss)" : "var(--quince)" }}
                  initial={false}
                  animate={{ width: `${ratio * 100}%` }}
                  transition={
                    reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
                  }
                />
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
