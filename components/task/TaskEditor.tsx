"use client";

import { useState } from "react";
import { Repeat, Trash2 } from "lucide-react";
import type {
  Category,
  ISODate,
  Recurrence,
  Series,
  Task,
  Weekday,
} from "@/lib/data/types";
import { recurrenceLabel } from "@/lib/data/series";
import { longDateLabel, todayISO } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { categoryColor } from "./TaskRow";

export type EditorTarget =
  | { kind: "new"; date: ISODate }
  | { kind: "edit"; task: Task };

type RecurrenceKind = "none" | "daily" | "weekdays" | "days";

const WEEKDAY_LABELS: Array<{ value: Weekday; label: string }> = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cmt" },
  { value: 7, label: "Paz" },
];

function Label({ children, htmlFor }: { children: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm text-muted">
      {children}
    </label>
  );
}

const fieldClass =
  "w-full rounded-md border border-rule bg-raised px-3 py-2 text-sm outline-none transition-colors focus:border-quince";

/** Panelin kimliği: değişince bileşen baştan kurulur, form kendiliğinden sıfırlanır. */
export function editorKey(target: EditorTarget): string {
  return target.kind === "edit" ? `edit:${target.task.id}` : `new:${target.date}`;
}

interface TaskEditorProps {
  /** Panel açıkken hep dolu; kapanma animasyonu bitene kadar da öyle kalır. */
  target: EditorTarget;
  open: boolean;
  categories: Category[];
  seriesList: Series[];
  onClose(): void;
  onSaveTask(
    id: string,
    patch: Partial<Task>,
  ): Promise<void>;
  onCreateTask(input: {
    title: string;
    note: string;
    categoryId: string | null;
    date: ISODate;
    startTime: string | null;
    durationMin: number | null;
    priority: "normal" | "high";
  }): Promise<void>;
  onCreateSeries(input: {
    title: string;
    note: string;
    categoryId: string | null;
    startTime: string | null;
    durationMin: number | null;
    priority: "normal" | "high";
    recurrence: Recurrence;
    startDate: ISODate;
  }): Promise<void>;
  onDeleteTask(task: Task): Promise<void>;
  onDeleteSeries(id: string): Promise<void>;
}

export function TaskEditor({
  target,
  open,
  categories,
  seriesList,
  onClose,
  onSaveTask,
  onCreateTask,
  onCreateSeries,
  onDeleteTask,
  onDeleteSeries,
}: TaskEditorProps) {
  const editing = target.kind === "edit" ? target.task : null;

  // Form alanları hedeften bir kez türetiliyor; başka bir göreve geçildiğinde
  // bileşen `editorKey` sayesinde zaten baştan kuruluyor.
  const [title, setTitle] = useState(editing?.title ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? null,
  );
  const [date, setDate] = useState<ISODate>(
    editing?.date ?? (target.kind === "new" ? target.date : todayISO()),
  );
  const [startTime, setStartTime] = useState(editing?.startTime ?? "");
  const [duration, setDuration] = useState(
    editing?.durationMin ? String(editing.durationMin) : "",
  );
  const [priority, setPriority] = useState<"normal" | "high">(
    editing?.priority ?? "normal",
  );
  const [recurrenceKind, setRecurrenceKind] = useState<RecurrenceKind>("none");
  const [recurrenceDays, setRecurrenceDays] = useState<Weekday[]>([]);
  const [saving, setSaving] = useState(false);

  const series = editing?.seriesId
    ? seriesList.find((s) => s.id === editing.seriesId)
    : undefined;

  const buildRecurrence = (): Recurrence | null => {
    switch (recurrenceKind) {
      case "none":
        return null;
      case "daily":
        return { kind: "daily" };
      case "weekdays":
        return { kind: "weekdays" };
      case "days":
        return recurrenceDays.length ? { kind: "days", days: recurrenceDays } : null;
    }
  };

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const cleanTitle = title.trim();
      const cleanTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
        ? startTime
        : null;
      const cleanDuration = duration.trim() ? Number(duration) : null;

      if (target.kind === "edit") {
        await onSaveTask(target.task.id, {
          title: cleanTitle,
          note: note.trim(),
          categoryId,
          date,
          startTime: cleanTime,
          durationMin:
            cleanDuration && cleanDuration > 0 ? cleanDuration : null,
          priority,
        });
      } else {
        const recurrence = buildRecurrence();
        const common = {
          title: cleanTitle,
          note: note.trim(),
          categoryId,
          startTime: cleanTime,
          durationMin: cleanDuration && cleanDuration > 0 ? cleanDuration : null,
          priority,
        };
        if (recurrence) {
          await onCreateSeries({ ...common, recurrence, startDate: date });
        } else {
          await onCreateTask({ ...common, date });
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? "Görevi düzenle" : "Yeni görev"}
      subtitle={editing ? longDateLabel(editing.date) : undefined}
      footer={
        <div className="flex items-center justify-between gap-3">
          {editing ? (
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await onDeleteTask(editing);
                onClose();
              }}
            >
              <Trash2 size={14} strokeWidth={1.75} />
              Sil
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="quiet" size="sm" onClick={onClose}>
              Vazgeç
            </Button>
            <Button variant="solid" size="sm" disabled={!canSave} onClick={save}>
              {editing ? "Kaydet" : "Ekle"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <Label htmlFor="task-title">Başlık</Label>
          <input
            id="task-title"
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSave) {
                e.preventDefault();
                void save();
              }
            }}
            placeholder="Ne yapılacak?"
            className={cn(fieldClass, "mt-1.5")}
          />
        </div>

        <div>
          <Label htmlFor="task-note">Not</Label>
          <textarea
            id="task-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="İsteğe bağlı"
            className={cn(fieldClass, "mt-1.5 resize-none leading-relaxed")}
          />
        </div>

        <div>
          <Label>Kategori</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const active = categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(active ? null : category.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    active
                      ? "border-transparent text-paper"
                      : "border-rule text-muted hover:border-ink/30 hover:text-ink",
                  )}
                  style={
                    active
                      ? { background: categoryColor(category) }
                      : undefined
                  }
                >
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{
                      background: active
                        ? "color-mix(in oklab, white 70%, transparent)"
                        : categoryColor(category),
                    }}
                  />
                  {category.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-date">Gün</Label>
            <input
              id="task-date"
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={cn(fieldClass, "numerals mt-1.5")}
            />
          </div>
          <div>
            <Label htmlFor="task-time">Saat</Label>
            <input
              id="task-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={cn(fieldClass, "numerals mt-1.5")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="task-duration">Süre (dakika)</Label>
            <input
              id="task-duration"
              type="number"
              min={0}
              step={5}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="—"
              className={cn(fieldClass, "numerals mt-1.5")}
            />
          </div>
          <div>
            <Label>Öncelik</Label>
            <div className="mt-1.5 flex rounded-md border border-rule p-0.5">
              {(["normal", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                  className={cn(
                    "flex-1 rounded-[5px] px-2 py-1 text-xs transition-colors",
                    priority === p
                      ? "bg-ink text-paper"
                      : "text-muted hover:text-ink",
                  )}
                >
                  {p === "normal" ? "Normal" : "Önemli"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tekrar yalnızca yeni görev kurarken sorulur; var olanı günü günüyle
            düzenlemek daha az sürprizli. */}
        {!editing && (
          <div className="border-t border-rule pt-5">
            <Label>Tekrar</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(
                [
                  ["none", "Tek seferlik"],
                  ["daily", "Her gün"],
                  ["weekdays", "Hafta içi"],
                  ["days", "Seçili günler"],
                ] as Array<[RecurrenceKind, string]>
              ).map(([kind, label]) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setRecurrenceKind(kind)}
                  aria-pressed={recurrenceKind === kind}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    recurrenceKind === kind
                      ? "border-transparent bg-ink text-paper"
                      : "border-rule text-muted hover:border-ink/30 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {recurrenceKind === "days" && (
              <div className="mt-3 flex gap-1">
                {WEEKDAY_LABELS.map(({ value, label }) => {
                  const active = recurrenceDays.includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        setRecurrenceDays((prev) =>
                          active
                            ? prev.filter((d) => d !== value)
                            : [...prev, value],
                        )
                      }
                      className={cn(
                        "flex-1 rounded-md border py-1.5 text-2xs transition-colors",
                        active
                          ? "border-quince bg-quince-wash text-ink"
                          : "border-rule text-muted hover:border-ink/30",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {recurrenceKind !== "none" && (
              <p className="mt-2.5 text-xs leading-relaxed text-faint">
                Görev, açtığın her haftada bu günlere kendiliğinden eklenir.
                Tek bir günü silmek seriyi bozmaz.
              </p>
            )}
          </div>
        )}

        {series && (
          <div className="rounded-md border border-rule bg-raised px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Repeat size={12} strokeWidth={1.75} />
              Tekrarlayan görev — {recurrenceLabel(series.recurrence)}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-faint">
              Buradaki değişiklik yalnızca bu günü etkiler.
            </p>
            <button
              type="button"
              onClick={async () => {
                await onDeleteSeries(series.id);
                onClose();
              }}
              className="mt-2 text-xs text-brick underline decoration-brick/40 underline-offset-2 hover:decoration-brick"
            >
              Tekrarı tamamen kaldır
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}
