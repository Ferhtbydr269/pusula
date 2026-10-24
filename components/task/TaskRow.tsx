"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CalendarArrowDown, Pencil, Trash2 } from "lucide-react";
import type { Category, Task } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const CATEGORY_VAR: Record<Category["color"], string> = {
  petrol: "var(--cat-petrol)",
  plum: "var(--cat-plum)",
  ochre: "var(--cat-ochre)",
  moss: "var(--cat-moss)",
  clay: "var(--cat-clay)",
  slate: "var(--cat-slate)",
};

export function categoryColor(category: Category | undefined): string {
  return category ? CATEGORY_VAR[category.color] : "var(--rule-strong)";
}

/** Tamamlayınca kalemin bıraktığı parıltı. */
function Sparkle({ color }: { color: string }) {
  const dots = [
    { x: -9, y: -8 },
    { x: 8, y: -9 },
    { x: 11, y: 3 },
    { x: -11, y: 4 },
    { x: 0, y: -13 },
  ];
  return (
    <span className="pointer-events-none absolute inset-0">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute top-1/2 left-1/2 size-1 rounded-full"
          style={{ background: color }}
          initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.6 }}
          animate={{ x: d.x, y: d.y, opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.55, delay: i * 0.015, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

function Checkbox({
  done,
  color,
  onToggle,
  title,
}: {
  done: boolean;
  color: string;
  onToggle(): void;
  title: string;
}) {
  const reduce = useReducedMotion();
  const [celebrate, setCelebrate] = useState(false);
  const prevDone = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current && !reduce) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 620);
      return () => clearTimeout(t);
    }
    prevDone.current = done;
  }, [done, reduce]);

  useEffect(() => {
    prevDone.current = done;
  }, [done]);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `${title} — geri al` : `${title} — tamamlandı işaretle`}
      onClick={onToggle}
      className="relative mt-[2px] grid size-[18px] shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-90"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" className="absolute inset-0">
        <motion.circle
          cx="9"
          cy="9"
          r="8"
          fill={done ? "var(--moss)" : "transparent"}
          stroke={done ? "var(--moss)" : color}
          strokeWidth="1.6"
          initial={false}
          animate={{ opacity: done ? 1 : 0.65 }}
          transition={{ duration: 0.2 }}
        />
        {done && (
          <motion.path
            d="M5.2 9.3 L7.7 11.8 L12.8 6.4"
            fill="none"
            stroke="var(--surface)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        )}
      </svg>
      <AnimatePresence>
        {celebrate && <Sparkle key="sparkle" color="var(--quince)" />}
      </AnimatePresence>
    </button>
  );
}

/**
 * Kalan erteleme hakkı: dolu nokta = kalan hak.
 * Hiç harcanmamışken soluk duruyor (anlatacak bir şey yok), hak eksildikçe
 * kontrastı artıyor — göz ancak gerektiğinde takılsın.
 */
function PostponeDots({ remaining, limit }: { remaining: number; limit: number }) {
  if (limit <= 0) return null;
  const untouched = remaining === limit;
  return (
    <span
      className={cn(
        "flex items-center gap-[3px] transition-opacity duration-200",
        untouched ? "opacity-45" : "opacity-100",
      )}
      title={
        remaining > 0
          ? `${remaining} erteleme hakkı kaldı`
          : "Erteleme hakkı kalmadı"
      }
    >
      {Array.from({ length: limit }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-[5px] rounded-full",
            i < remaining
              ? "bg-quince"
              : "border border-rule-strong bg-transparent",
          )}
        />
      ))}
    </span>
  );
}

interface TaskRowProps {
  task: Task;
  category: Category | undefined;
  postponeLimit: number;
  onToggle(): void;
  onPostpone(): void;
  onEdit(): void;
  onDelete(): void;
  dimmed?: boolean;
}

export function TaskRow({
  task,
  category,
  postponeLimit,
  onToggle,
  onPostpone,
  onEdit,
  onDelete,
  dimmed = false,
}: TaskRowProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const done = task.status === "done";
  const remaining = Math.max(0, postponeLimit - task.postponeCount);
  const outOfPostpones = remaining === 0;
  const color = categoryColor(category);

  return (
    <motion.div
      ref={setNodeRef}
      layout="position"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: isDragging ? 0.35 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.18 } }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      /* Görev, sayfanın üstüne konmuş bir kağıt parçası gibi durmalı.
         Zemini sayfayla aynı olduğunda çizgilere ve hedef satırlarına
         karışıyor, "yapılacaklar" seçilemiyordu: artık bir tık daha açık
         zemin, saç teli kenarlık ve çok hafif bir kabarma var. */
      className={cn(
        "group/task relative rounded-md border border-rule/70 bg-raised py-2 pr-1.5 pl-2.5 shadow-[0_1px_0_rgb(36_26_18_/_0.05)] transition-colors duration-150",
        "hover:border-rule-strong hover:bg-raised",
        done && "border-rule/40 bg-surface shadow-none",
        dimmed && !done && "opacity-80",
      )}
    >
      {/* Kategori, satırın sol kenarındaki renk çizgisi. */}
      <span
        aria-hidden
        className="absolute top-1.5 bottom-1.5 left-0 w-[2.5px] rounded-full transition-opacity duration-200"
        style={{ background: color, opacity: done ? 0.3 : 0.9 }}
      />

      <div className="flex items-start gap-2">
        <Checkbox done={done} color={color} onToggle={onToggle} title={task.title} />

        <div className="min-w-0 flex-1">
          <div
            {...attributes}
            {...listeners}
            // dnd-kit buraya role="button" koyuyor; adını kendimiz veriyoruz
            // ki ekran okuyucuda adsız bir düğme olarak durmasın.
            aria-label={`${task.title} — düzenlemek için dokun, sürükleyerek başka güne taşı`}
            /* Satıra dokunmak düzenleyiciyi açıyor. Erteleme, düzenleme ve
               silme yalnızca fare üstüne gelince beliriyordu; dokunmatikte ve
               ilk kullanımda bu eylemlerin varlığı hiç anlaşılmıyordu.
               Sürükleme eşiği 6 piksel olduğu için tıklama ile sürükleme
               birbirine karışmıyor. */
            onClick={onEdit}
            // Sürüklemek için başlığa basılı tutmak yeterli; ayrı tutamaç yok.
            className="cursor-pointer touch-none"
          >
            <p
              className={cn(
                "text-sm leading-snug break-words transition-colors duration-300",
                done ? "text-faint" : "text-ink",
                task.priority === "high" && !done && "font-medium",
              )}
              style={{
                textDecorationLine: done ? "line-through" : "none",
                textDecorationColor: done ? "currentColor" : "transparent",
                textDecorationThickness: "1px",
              }}
            >
              {task.priority === "high" && !done && (
                <span
                  aria-label="Önemli"
                  title="Önemli"
                  className="mr-1 inline-block size-1.5 -translate-y-px rounded-full bg-quince align-middle"
                />
              )}
              {task.title}
            </p>
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-2xs text-muted">
            {task.startTime && (
              <span className="numerals shrink-0 text-ink/70">
                {task.startTime}
              </span>
            )}
            {category && (
              <span
                className="truncate"
                style={{ color, opacity: done ? 0.5 : 1 }}
              >
                {category.name}
              </span>
            )}
            {task.postponeCount > 0 && (
              <span className="shrink-0 text-faint italic">ertelendi</span>
            )}
            {task.note && (
              <span className="truncate text-faint" title={task.note}>
                {task.note}
              </span>
            )}
            {!done && (
              <span className="ml-auto shrink-0 pl-1">
                <PostponeDots remaining={remaining} limit={postponeLimit} />
              </span>
            )}
          </div>
        </div>

        {/* Eylemler akışta yer kaplamıyor: dar sütunda bütün genişlik başlığın
            olsun diye üstte, sadece üzerine gelince beliriyorlar.
            Dokunmatik ekranda "üzerine gelmek" diye bir şey yok — orada
            sürekli görünürler, yoksa görev hiç düzenlenemezdi. */}
        <div className="pointer-events-none absolute top-1 right-1 flex items-center gap-0.5 rounded-md bg-raised/95 px-0.5 opacity-0 shadow-lift transition-opacity duration-150 group-hover/task:pointer-events-auto group-hover/task:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 pointer-coarse:pointer-events-auto pointer-coarse:opacity-100">
          <button
            type="button"
            onClick={onPostpone}
            aria-disabled={outOfPostpones}
            title={
              outOfPostpones
                ? "Erteleme hakkı kalmadı"
                : "Yarına ertele (bir hak harcar)"
            }
            aria-label="Yarına ertele"
            className={cn(
              "rounded p-1 transition-colors",
              outOfPostpones
                ? "text-faint/60 hover:bg-transparent"
                : "text-muted hover:bg-sunk hover:text-ink",
            )}
          >
            <CalendarArrowDown size={13} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onEdit}
            title="Düzenle"
            aria-label="Görevi düzenle"
            className="rounded p-1 text-muted transition-colors hover:bg-sunk hover:text-ink"
          >
            <Pencil size={13} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Sil"
            aria-label="Görevi sil"
            className="rounded p-1 text-muted transition-colors hover:bg-sunk hover:text-brick"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
