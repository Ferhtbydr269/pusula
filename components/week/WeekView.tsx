"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import type {
  Category,
  DailyTracking,
  ISODate,
  Settings,
  Task,
} from "@/lib/data/types";
import { dayNameShort, dayOfMonth, isToday } from "@/lib/date";
import { useIsWideScreen } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";
import { DayColumn } from "./DayColumn";

interface WeekViewProps {
  dates: ISODate[];
  tasksByDate: Record<ISODate, Task[]>;
  trackingByDate: Record<ISODate, DailyTracking>;
  settings: Settings;
  categories: Category[];
  categoryById: Record<string, Category>;
  selectedDay: ISODate;
  onSelectDay(date: ISODate): void;
  lastCategoryId: string | null;
  onPickCategory(id: string | null): void;
  onAdd(date: ISODate, input: { title: string; startTime: string | null; categoryId: string | null }): void;
  onToggle(task: Task): void;
  onPostpone(task: Task): void;
  onEdit(task: Task): void;
  onDelete(task: Task): void;
  onTracking(date: ISODate, patch: Partial<DailyTracking>): void;
  onOpenDay(date: ISODate): void;
  onMove(task: Task, date: ISODate): void;
}

/** Mobilde gün seçici: yedi gün yan yana sığmadığında tek gün gösteriyoruz. */
function DayPicker({
  dates,
  tasksByDate,
  selected,
  onSelect,
}: {
  dates: ISODate[];
  tasksByDate: Record<ISODate, Task[]>;
  selected: ISODate;
  onSelect(date: ISODate): void;
}) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-rule px-2 py-2">
      {dates.map((date) => {
        const tasks = tasksByDate[date] ?? [];
        const done = tasks.filter((t) => t.status === "done").length;
        const active = selected === date;
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect(date)}
            aria-pressed={active}
            aria-label={`${dayNameShort(date)} ${dayOfMonth(date)}`}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg border px-1 py-1.5 transition-colors",
              active
                ? "border-quince-soft bg-quince-wash"
                : "border-transparent hover:bg-surface",
            )}
          >
            <span
              className={cn(
                "text-2xs",
                isToday(date) ? "text-quince" : "text-muted",
              )}
            >
              {dayNameShort(date)}
            </span>
            <span
              className={cn(
                "numerals text-base leading-none",
                isToday(date) ? "text-quince" : "text-ink",
              )}
            >
              {dayOfMonth(date)}
            </span>
            <Ring
              value={tasks.length ? done / tasks.length : 0}
              empty={tasks.length === 0}
              size={12}
              thickness={2}
            />
          </button>
        );
      })}
    </div>
  );
}

export function WeekView(props: WeekViewProps) {
  const {
    dates,
    tasksByDate,
    trackingByDate,
    settings,
    categories,
    categoryById,
    selectedDay,
    onSelectDay,
    onMove,
  } = props;

  const [dragging, setDragging] = useState<Task | null>(null);
  const wide = useIsWideScreen();

  // 6 px'lik eşik: tıklamayla sürükleme karışmasın.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnProps = (date: ISODate) => ({
    date,
    tasks: tasksByDate[date] ?? [],
    tracking: trackingByDate[date],
    settings,
    categories,
    categoryById,
    lastCategoryId: props.lastCategoryId,
    onPickCategory: props.onPickCategory,
    onAdd: props.onAdd,
    onToggle: props.onToggle,
    onPostpone: props.onPostpone,
    onEdit: props.onEdit,
    onDelete: props.onDelete,
    onTracking: props.onTracking,
    onOpenDay: props.onOpenDay,
  });

  const onDragStart = (e: DragStartEvent) => {
    setDragging((e.active.data.current?.task as Task) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragging(null);
    const task = e.active.data.current?.task as Task | undefined;
    const target = e.over?.data.current?.date as ISODate | undefined;
    if (task && target && target !== task.date) onMove(task, target);
  };

  const activeDate = dates.includes(selectedDay) ? selectedDay : dates[0];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <main className="min-h-0 flex-1 overflow-hidden rounded-xl border border-rule bg-surface">
        {wide ? (
          /* ── masaüstü: yedi gün tek sayfada ── */
          <div className="grid h-full grid-cols-7">
            {dates.map((date) => (
              <DayColumn key={date} {...columnProps(date)} />
            ))}
          </div>
        ) : (
          /* ── küçük ekran: gün seçici + tek gün ── */
          <div className="flex h-full flex-col">
            <DayPicker
              dates={dates}
              tasksByDate={tasksByDate}
              selected={activeDate}
              onSelect={onSelectDay}
            />
            <div className="min-h-0 flex-1">
              <DayColumn key={activeDate} {...columnProps(activeDate)} standalone />
            </div>
          </div>
        )}
      </main>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {dragging && (
          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: 1.02 }}
            className="rounded-md border border-quince-soft bg-raised px-3 py-2 text-sm shadow-lift-strong"
          >
            {dragging.title}
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
