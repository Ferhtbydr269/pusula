"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import type { Category, ISODate } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { categoryColor } from "./TaskRow";

/** "09:30 İngilizce çalış" → saat ayrı alana geçsin, başlık temiz kalsın. */
export function parseLeadingTime(raw: string): {
  title: string;
  startTime: string | null;
} {
  const match = raw.match(/^([01]?\d|2[0-3])[:.]([0-5]\d)\s+(.*)$/);
  if (!match) return { title: raw.trim(), startTime: null };
  const [, h, m, rest] = match;
  if (!rest.trim()) return { title: raw.trim(), startTime: null };
  return {
    title: rest.trim(),
    startTime: `${h.padStart(2, "0")}:${m}`,
  };
}

interface QuickAddProps {
  date: ISODate;
  categories: Category[];
  lastCategoryId: string | null;
  onPickCategory(id: string | null): void;
  onAdd(input: { title: string; startTime: string | null; categoryId: string | null }): void;
  /** Klavyeyle gün sütunları arasında geçiş. */
  onLeave?(direction: -1 | 1): void;
}

export function QuickAdd({
  date,
  categories,
  lastCategoryId,
  onPickCategory,
  onAdd,
  onLeave,
}: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const { title, startTime } = parseLeadingTime(value);
    if (!title) return;
    onAdd({ title, startTime, categoryId: lastCategoryId });
    setValue("");
    // Odak kalsın: üst üste görev eklemek akıcı olsun.
    inputRef.current?.focus();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-quickadd={date}
        className="group/add flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-xs text-faint transition-colors duration-150 hover:bg-surface hover:text-muted"
      >
        <Plus size={13} strokeWidth={2} className="shrink-0" />
        <span>Görev ekle</span>
      </button>
    );
  }

  return (
    <div className="rounded-md bg-raised p-2 shadow-lift">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setValue("");
            setOpen(false);
          } else if (e.key === "Tab" && onLeave) {
            e.preventDefault();
            setOpen(false);
            onLeave(e.shiftKey ? -1 : 1);
          }
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false);
        }}
        placeholder="Ne yapılacak?"
        aria-label="Yeni görev"
        className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
      />

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1" role="group" aria-label="Kategori">
          {categories.map((category) => {
            const active = lastCategoryId === category.id;
            return (
              <button
                key={category.id}
                type="button"
                title={category.name}
                aria-label={category.name}
                aria-pressed={active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPickCategory(active ? null : category.id)}
                className={cn(
                  "size-3.5 rounded-full transition-transform duration-150 hover:scale-115",
                  active && "ring-2 ring-offset-2 ring-offset-raised",
                )}
                style={{
                  background: categoryColor(category),
                  opacity: active ? 1 : 0.5,
                  ...(active
                    ? ({ "--tw-ring-color": categoryColor(category) } as CSSProperties)
                    : {}),
                }}
              />
            );
          })}
        </div>

        <AnimatePresence>
          {value.trim() && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="numerals shrink-0 text-2xs text-faint"
            >
              Enter
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
