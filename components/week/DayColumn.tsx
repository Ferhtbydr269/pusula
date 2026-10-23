"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import type { Category, DailyTracking, ISODate, Settings, Task } from "@/lib/data/types";
import { dayNameShort, dayOfMonth, isPastDay, isToday } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { QuickAdd } from "@/components/task/QuickAdd";
import { TaskRow } from "@/components/task/TaskRow";
import { DayRibbon } from "@/components/tracking/DayRibbon";

interface DayColumnProps {
  date: ISODate;
  tasks: Task[];
  tracking: DailyTracking;
  settings: Settings;
  categories: Category[];
  categoryById: Record<string, Category>;
  lastCategoryId: string | null;
  onPickCategory(id: string | null): void;
  onAdd(date: ISODate, input: { title: string; startTime: string | null; categoryId: string | null }): void;
  onToggle(task: Task): void;
  onPostpone(task: Task): void;
  onEdit(task: Task): void;
  onDelete(task: Task): void;
  onTracking(date: ISODate, patch: Partial<DailyTracking>): void;
  onOpenDay(date: ISODate): void;
  /** Mobilde tek gün gösterildiğinde sütun kenarlığı gereksiz. */
  standalone?: boolean;
}

/**
 * Boş gün suçlayıcı olmasın. Geçmiş ve ileriki boş günlerde hiçbir şey
 * yazmıyoruz — çizgili boş sayfa zaten "burası boş" diyor. Yalnızca bugün
 * boşsa kısa bir davet var.
 */
function EmptyToday() {
  return (
    <p className="mt-1 px-2 text-xs leading-relaxed text-faint">
      Bugüne ilk satırı yaz.
    </p>
  );
}

export function DayColumn({
  date,
  tasks,
  tracking,
  settings,
  categories,
  categoryById,
  lastCategoryId,
  onPickCategory,
  onAdd,
  onToggle,
  onPostpone,
  onEdit,
  onDelete,
  onTracking,
  onOpenDay,
  standalone = false,
}: DayColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: date, data: { date } });

  const today = isToday(date);
  const past = isPastDay(date);
  const done = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;

  return (
    <div
      className={cn(
        "flex h-full min-w-0 flex-col",
        !standalone && "border-r border-rule last:border-r-0",
        today && "today-light",
        isOver && "bg-quince-wash",
      )}
    >
      {/* ── gün başlığı ── */}
      <header
        className={cn(
          "shrink-0 border-b px-3 pt-3.5 pb-3",
          today ? "border-today-edge" : "border-rule",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className={cn(
              "text-xs font-medium",
              past && !today && "text-faint",
              today ? "text-ink" : "text-muted",
            )}
          >
            {dayNameShort(date)}
          </span>
          <span className="flex items-center gap-1.5">
            {total > 0 && (
              <span
                className={cn(
                  "numerals text-2xs",
                  done === total ? "text-moss" : "text-muted",
                )}
              >
                {done}/{total}
              </span>
            )}
            <Ring
              value={total ? done / total : 0}
              empty={total === 0}
              size={18}
              thickness={2.25}
              label={total ? `${done} / ${total} görev tamam` : "görev yok"}
            />
          </span>
        </div>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={cn(
              "numerals text-2xl leading-none",
              today ? "text-quince" : past ? "text-faint" : "text-ink",
            )}
          >
            {dayOfMonth(date)}
          </span>
          {today && (
            <span className="text-xs text-quince">bugün</span>
          )}
        </div>
      </header>

      {/* ── görevler: yazılmamış yer çizgisini gösterir ── */}
      <div
        ref={setNodeRef}
        className="ruled min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2"
      >
        <div className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                category={
                  task.categoryId ? categoryById[task.categoryId] : undefined
                }
                postponeLimit={settings.postponeLimit}
                dimmed={past}
                onToggle={() => onToggle(task)}
                onPostpone={() => onPostpone(task)}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task)}
              />
            ))}
          </AnimatePresence>
        </div>

        <motion.div layout="position" className={total ? "mt-1" : ""}>
          <QuickAdd
            date={date}
            categories={categories}
            lastCategoryId={lastCategoryId}
            onPickCategory={onPickCategory}
            onAdd={(input) => onAdd(date, input)}
          />
          {total === 0 && today && <EmptyToday />}
        </motion.div>
      </div>

      {/* ── günlük takip şeridi ── */}
      <DayRibbon
        date={date}
        tracking={tracking}
        settings={settings}
        onTracking={onTracking}
        onOpen={() => onOpenDay(date)}
        today={today}
        roomy={standalone}
      />
    </div>
  );
}
