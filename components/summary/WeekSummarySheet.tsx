"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import type { DailyTracking, ISODate, Settings, Task } from "@/lib/data/types";
import type { WeekSummary } from "@/lib/store/PlannerProvider";
import {
  dayNameLong,
  dayNameShort,
  dayOfMonth,
  isToday,
  todayISO,
  weekRangeLabel,
} from "@/lib/date";
import { formatAverage, formatPair, weekHabits } from "@/lib/tracking";
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
  settings: Settings;
}

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-base">{children}</h3>;
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
function weekSentence(summary: WeekSummary, ended: boolean): string {
  if (summary.total === 0) {
    return ended
      ? "Bu haftaya hiç görev yazmamışsın. Olur böyle haftalar."
      : "Bu haftaya henüz hiçbir şey yazmadın. Boş bir sayfa da bir başlangıç.";
  }

  const parts: string[] = [];
  parts.push(`${summary.total} görevin ${summary.done} tanesini bitirdin.`);
  if (summary.bestDay && summary.done > 0) {
    parts.push(`En verimli günün ${dayNameLong(summary.bestDay)}.`);
  }
  if (summary.postponed > 0) {
    parts.push(`${summary.postponed} görev ertelendi.`);
  }
  if (!ended && summary.todo > 0) {
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
  settings,
}: WeekSummarySheetProps) {
  const today = todayISO();
  const ended = dates[6] < today;
  const future = dates[0] > today;
  const habits = weekHabits(dates, trackingByDate, settings, today);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ended ? "Hafta kapandı" : future ? "Gelecek hafta" : "Bu hafta"}
      subtitle={weekRangeLabel(dates)}
    >
      <div className="flex flex-col gap-7">
        {/* ── genel ilerleme ── */}
        <div className="flex items-center gap-5">
          <div className="relative grid shrink-0 place-items-center">
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
            {weekSentence(summary, ended)}
          </p>
        </div>

        {/* ── görevler ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Görevler</SectionTitle>

          <div className="mt-3 grid grid-cols-3 gap-4">
            <Stat value={String(summary.done)} label="tamamlandı" tone="moss" />
            <Stat value={String(summary.todo)} label="bekliyor" />
            <Stat
              value={String(summary.postponed)}
              label="ertelendi"
              tone={summary.postponed > 0 ? "quince" : "muted"}
            />
          </div>

          <div className="mt-5 flex flex-col gap-2">
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
        </section>

        {/* ── alışkanlıklar: haftanın asıl verisi ── */}
        {habits.length > 0 && (
          <section className="border-t border-rule pt-6">
            <SectionTitle>Alışkanlıklar</SectionTitle>
            {/* Noktaların hangi güne denk geldiğini yazıyla söylüyoruz:
                her satıra gün adı eklemek üç kat tekrar olurdu, ipucu
                balonu da dokunmatikte okunmuyor. */}
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Soldan sağa pazartesiden pazara. Hedefini tutturduğun günler
              dolu.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              {habits.map((habit) => (
                <div key={habit.metric.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">{habit.metric.label}</span>
                    <span
                      className={cn(
                        "numerals text-sm",
                        habit.hitDays === habit.elapsedDays && habit.elapsedDays > 0
                          ? "text-moss"
                          : "text-muted",
                      )}
                    >
                      {habit.hitDays}/{habit.elapsedDays} gün
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      {habit.days.map((day) => (
                        <span
                          key={day.date}
                          title={`${dayNameShort(day.date)} ${dayOfMonth(day.date)} — ${formatPair(habit.metric, day.value, habit.goal)}`}
                          className={cn(
                            "size-2.5 rounded-full",
                            !day.elapsed
                              ? "border border-dashed border-rule-strong"
                              : day.reached
                                ? "bg-moss"
                                : "border border-rule-strong bg-transparent",
                          )}
                        />
                      ))}
                    </span>
                    <span className="numerals shrink-0 text-2xs text-faint">
                      ort. {formatAverage(habit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── ruh hali ── */}
        {settings.tracking.mood && (
          <section className="border-t border-rule pt-6">
            <SectionTitle>Haftanın ruh hali</SectionTitle>
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
                          {date <= today ? "·" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── seri ── */}
        <section className="border-t border-rule pt-6">
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
        </section>
      </div>
    </Sheet>
  );
}
