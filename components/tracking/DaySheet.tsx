"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { BookOpen, Footprints, Moon, Target } from "lucide-react";
import type { DailyTracking, ISODate, Mood, Settings } from "@/lib/data/types";
import { longDateLabel } from "@/lib/date";
import { cn, debounce, formatMinutes } from "@/lib/utils";
import { Sheet } from "@/components/ui/Sheet";
import { MOODS } from "./DayRibbon";
import { WaterGlasses } from "./WaterGlasses";

interface MetricProps {
  icon: ReactNode;
  label: string;
  value: number;
  goal: number;
  step: number;
  /** Değeri gösterirken kullanılacak biçim ("45 dk", "7,5 sa"). */
  format(value: number): string;
  onChange(next: number): void;
}

function Metric({ icon, label, value, goal, step, format, onChange }: MetricProps) {
  const reached = goal > 0 && value >= goal;
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-muted">
          <span className={reached ? "text-moss" : "text-faint"}>{icon}</span>
          {label}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, value - step))}
            disabled={value <= 0}
            aria-label={`${label} azalt`}
            className="grid size-6 place-items-center rounded-md border border-rule text-muted transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-40 disabled:hover:border-rule"
          >
            −
          </button>
          <span
            className={cn(
              "numerals w-16 text-center text-sm",
              reached ? "text-moss" : value > 0 ? "text-ink" : "text-faint",
            )}
          >
            {value > 0 ? format(value) : "—"}
          </span>
          <button
            type="button"
            onClick={() => onChange(value + step)}
            aria-label={`${label} artır`}
            className="grid size-6 place-items-center rounded-md border border-rule text-muted transition-colors hover:border-ink/40 hover:text-ink"
          >
            +
          </button>
        </div>
      </div>

      {goal > 0 && (
        <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-sunk">
          <motion.div
            className="h-full rounded-full"
            style={{ background: reached ? "var(--moss)" : "var(--quince)" }}
            initial={false}
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      )}
    </div>
  );
}

interface DaySheetProps {
  date: ISODate | null;
  tracking: DailyTracking | null;
  settings: Settings;
  onClose(): void;
  onChange(date: ISODate, patch: Partial<DailyTracking>): void;
}

export function DaySheet({
  date: dateProp,
  tracking: trackingProp,
  settings,
  onClose,
  onChange,
}: DaySheetProps) {
  const open = Boolean(dateProp && trackingProp);
  const [note, setNote] = useState("");
  const dateRef = useRef<ISODate | null>(null);

  /* Panel kapanırken içeriği bir an daha tutuyoruz, yoksa kayarak çıkma
     animasyonu boş bir panelle oynuyor. */
  const shown = useRef<{ date: ISODate; tracking: DailyTracking } | null>(null);
  if (dateProp && trackingProp) {
    shown.current = { date: dateProp, tracking: trackingProp };
  }

  // Not alanı her tuş vuruşunda yazmasın; 600 ms sonra ya da panel kapanınca kaydet.
  const saveNote = useMemo(
    () =>
      debounce((value: string) => {
        if (dateRef.current) onChange(dateRef.current, { note: value });
      }, 600),
    [onChange],
  );

  useEffect(() => {
    if (dateProp && dateProp !== dateRef.current) {
      saveNote.flush();
      dateRef.current = dateProp;
      setNote(trackingProp?.note ?? "");
    }
  }, [dateProp, trackingProp?.note, saveNote]);

  useEffect(() => {
    if (!open) saveNote.flush();
  }, [open, saveNote]);

  const view = shown.current;
  if (!view) return null;

  const { date, tracking } = view;
  const { tracking: on, goals } = settings;
  const set = (patch: Partial<DailyTracking>) => onChange(date, patch);

  return (
    <Sheet
      open={open}
      onClose={() => {
        saveNote.flush();
        onClose();
      }}
      title="Günlük takip"
      subtitle={longDateLabel(date)}
    >
      <div className="flex flex-col gap-7">
        {on.water && (
          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Su</span>
              <span className="numerals text-sm text-muted">
                <span
                  className={
                    tracking.waterGlasses >= goals.water ? "text-moss" : "text-ink"
                  }
                >
                  {tracking.waterGlasses}
                </span>
                {" / "}
                {goals.water} bardak
              </span>
            </div>
            <div className="mt-3">
              <WaterGlasses
                value={tracking.waterGlasses}
                goal={goals.water}
                size="md"
                onChange={(waterGlasses) => set({ waterGlasses })}
              />
            </div>
            {tracking.waterGlasses >= goals.water && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-moss"
              >
                Su hedefi tamam.
              </motion.p>
            )}
          </div>
        )}

        {(on.movement || on.sleep || on.reading || on.focus) && (
          <div className="flex flex-col gap-5 border-t border-rule pt-6">
            {on.movement && (
              <Metric
                icon={<Footprints size={15} strokeWidth={1.75} />}
                label="Hareket"
                value={tracking.movementMin}
                goal={goals.movement}
                step={5}
                format={(v) => formatMinutes(v)}
                onChange={(movementMin) => set({ movementMin })}
              />
            )}
            {on.sleep && (
              <Metric
                icon={<Moon size={15} strokeWidth={1.75} />}
                label="Uyku"
                value={tracking.sleepHours}
                goal={goals.sleep}
                step={0.5}
                format={(v) => `${v.toString().replace(".", ",")} sa`}
                onChange={(sleepHours) => set({ sleepHours })}
              />
            )}
            {on.reading && (
              <Metric
                icon={<BookOpen size={15} strokeWidth={1.75} />}
                label="Okuma"
                value={tracking.readingMin}
                goal={goals.reading}
                step={5}
                format={(v) => formatMinutes(v)}
                onChange={(readingMin) => set({ readingMin })}
              />
            )}
            {on.focus && (
              <Metric
                icon={<Target size={15} strokeWidth={1.75} />}
                label="Odak süresi"
                value={tracking.focusMin}
                goal={goals.focus}
                step={15}
                format={(v) => formatMinutes(v)}
                onChange={(focusMin) => set({ focusMin })}
              />
            )}
          </div>
        )}

        {on.mood && (
          <div className="border-t border-rule pt-6">
            <span className="text-sm text-muted">Ruh hali</span>
            <div className="mt-3 flex gap-2">
              {MOODS.map((m) => {
                const active = tracking.mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    title={m.label}
                    aria-label={m.label}
                    aria-pressed={active}
                    onClick={() =>
                      set({ mood: active ? null : (m.value as Mood) })
                    }
                    className={cn(
                      "grid size-11 place-items-center rounded-lg border text-xl transition-all duration-150 hover:scale-105",
                      active
                        ? "border-quince bg-quince-wash"
                        : "border-rule hover:border-ink/30",
                    )}
                  >
                    {m.emoji}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {on.note && (
          <div className="border-t border-rule pt-6">
            <label htmlFor="day-note" className="text-sm text-muted">
              Günün notu
            </label>
            <textarea
              id="day-note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                saveNote(e.target.value);
              }}
              onBlur={() => saveNote.flush()}
              rows={4}
              placeholder="Bugünden akılda kalan…"
              className="mt-2 w-full resize-none rounded-md border border-rule bg-raised px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-quince"
            />
          </div>
        )}
      </div>
    </Sheet>
  );
}
