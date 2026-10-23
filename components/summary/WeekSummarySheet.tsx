"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { DailyTracking, ISODate, Task } from "@/lib/data/types";
import type { WeekSummary } from "@/lib/store/PlannerProvider";
import {
  dayNameLong,
  dayNameShort,
  dayOfMonth,
  isPastDay,
  isToday,
  todayISO,
  weekRangeLabel,
} from "@/lib/date";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { Sheet } from "@/components/ui/Sheet";
import { MOODS } from "@/components/tracking/DayRibbon";

interface WeekSummarySheetProps {
  open: boolean;
  onClose(): void;
  dates: ISODate[];
  summary: WeekSummary;
  trackingByDate: Record<ISODate, DailyTracking>;
  tasksByDate: Record<ISODate, Task[]>;
  waterGoal: number;
}

function Stat({
  value,
  label,
  tone = "ink",
}: {
  value: string;
  label: string;
  tone?: "ink" | "moss" | "quince" | "muted";
}) {
  const colors = {
    ink: "text-ink",
    moss: "text-moss",
    quince: "text-quince",
    muted: "text-muted",
  } as const;
  return (
    <div>
      <p className={cn("numerals text-2xl leading-none", colors[tone])}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

/** Rakamları cümleye çevir — pano değil, kısa bir değerlendirme olsun. */
function weekSentence(
  summary: WeekSummary,
  dates: ISODate[],
): string {
  if (summary.total === 0) {
    return "Bu haftaya henüz hiçbir şey yazmadın. Boş bir sayfa da bir başlangıç.";
  }
  const parts: string[] = [];
  parts.push(`${summary.total} görevin ${summary.done} tanesini bitirdin.`);
  if (summary.bestDay && summary.done > 0) {
    parts.push(`En verimli günün ${dayNameLong(summary.bestDay)}.`);
  }
  if (summary.postponed > 0) {
    parts.push(`${summary.postponed} görev ertelendi.`);
  }
  if (summary.todo > 0 && dates[6] >= todayISO()) {
    parts.push(`${summary.todo} görev seni bekliyor.`);
  }
  return parts.join(" ");
}

export function WeekSummarySheet({
  open,
  onClose,
  dates,
  summary,
  trackingByDate,
  tasksByDate,
  waterGoal,
}: WeekSummarySheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Bu hafta"
      subtitle={weekRangeLabel(dates)}
    >
      <div className="flex flex-col gap-7">
        {/* ── genel ilerleme ── */}
        <div className="flex items-center gap-5">
          <div className="relative grid place-items-center">
            <Ring
              value={summary.total ? summary.done / summary.total : 0}
              empty={summary.total === 0}
              size={78}
              thickness={5}
            />
            <span className="numerals absolute text-lg">
              {summary.total ? `%${summary.percent}` : "—"}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted">
            {weekSentence(summary, dates)}
          </p>
        </div>

        {/* ── sayılar ── */}
        <div className="grid grid-cols-3 gap-4 border-t border-rule pt-6">
          <Stat value={String(summary.done)} label="tamamlandı" tone="moss" />
          <Stat value={String(summary.todo)} label="bekliyor" />
          <Stat
            value={String(summary.postponed)}
            label="ertelendi"
            tone={summary.postponed > 0 ? "quince" : "muted"}
          />
        </div>

        {/* ── seri ── */}
        <div className="flex items-center gap-3 rounded-lg border border-rule bg-raised px-4 py-3">
          <span className={summary.streak > 0 ? "text-quince" : "text-faint"}>
            <Flame size={18} strokeWidth={1.75} />
          </span>
          <div>
            <p className="text-sm">
              {summary.streak > 0 ? (
                <>
                  <span className="numerals">{summary.streak}</span> gün üst üste
                </>
              ) : (
                "Seri henüz başlamadı"
              )}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Görevlerinin en az %70&apos;ini bitirdiğin günler — bu hafta içinde.
            </p>
          </div>
        </div>

        {/* ── ruh hali şeridi ── */}
        <div className="border-t border-rule pt-6">
          <p className="text-sm text-muted">Haftanın ruh hali</p>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {dates.map((date) => {
              const mood = trackingByDate[date]?.mood;
              const emoji = MOODS.find((m) => m.value === mood)?.emoji;
              return (
                <div key={date} className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "text-2xs",
                      isToday(date) ? "text-quince" : "text-faint",
                    )}
                  >
                    {dayNameShort(date)}
                  </span>
                  <div
                    className={cn(
                      "grid h-8 w-full place-items-center rounded-md border text-base",
                      isToday(date)
                        ? "border-quince-soft bg-quince-wash"
                        : "border-rule bg-raised",
                    )}
                  >
                    {emoji ?? (
                      <span className="text-xs text-faint">
                        {isPastDay(date) ? "·" : ""}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ortalamalar ── */}
        <div className="grid grid-cols-2 gap-4 border-t border-rule pt-6">
          <div>
            <p className="numerals text-xl">
              {summary.waterAvg.toString().replace(".", ",")}
              <span className="text-sm text-muted"> / {waterGoal}</span>
            </p>
            <p className="mt-1 text-xs text-muted">günlük su ortalaması</p>
          </div>
          <div>
            <p className="numerals text-xl">
              {summary.movementAvg}
              <span className="text-sm text-muted"> dk</span>
            </p>
            <p className="mt-1 text-xs text-muted">günlük hareket ortalaması</p>
          </div>
        </div>

        {/* ── günlere göre tamamlanma ── */}
        <div className="border-t border-rule pt-6">
          <p className="text-sm text-muted">Günlere göre</p>
          <div className="mt-3 flex flex-col gap-2">
            {dates.map((date) => {
              const tasks = tasksByDate[date] ?? [];
              const done = tasks.filter((t) => t.status === "done").length;
              const ratio = tasks.length ? done / tasks.length : 0;
              return (
                <div key={date} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "numerals w-14 shrink-0 text-xs whitespace-nowrap",
                      isToday(date) ? "text-quince" : "text-muted",
                    )}
                  >
                    {dayNameShort(date)} {dayOfMonth(date)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunk">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: ratio === 1 ? "var(--moss)" : "var(--quince)",
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio * 100}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <span className="numerals w-10 shrink-0 text-right text-2xs text-faint">
                    {tasks.length ? `${done}/${tasks.length}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
