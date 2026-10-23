"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CloudOff,
  LogOut,
  Moon,
  Settings,
  Sun,
  SunDim,
} from "lucide-react";
import { lineOfTheDay, weekRangeLabel } from "@/lib/date";
import type { ISODate } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Ring } from "@/components/ui/Ring";

function GreetingIcon({ icon }: { icon: "dawn" | "day" | "dusk" | "night" }) {
  const common = { size: 15, strokeWidth: 1.75 } as const;
  if (icon === "night") return <Moon {...common} />;
  if (icon === "dawn") return <SunDim {...common} />;
  if (icon === "dusk") return <SunDim {...common} />;
  return <Sun {...common} />;
}

interface HeaderProps {
  name: string;
  greeting: { text: string; icon: "dawn" | "day" | "dusk" | "night" };
  dates: ISODate[];
  weekOffset: number;
  percent: number;
  done: number;
  total: number;
  email: string;
  localMode: boolean;
  onPrev(): void;
  onNext(): void;
  onToday(): void;
  onOpenSummary(): void;
  onOpenSettings(): void;
  onSignOut(): void;
}

export function Header({
  name,
  greeting,
  dates,
  weekOffset,
  percent,
  done,
  total,
  email,
  localMode,
  onPrev,
  onNext,
  onToday,
  onOpenSummary,
  onOpenSettings,
  onSignOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="flex shrink-0 items-start justify-between gap-4 px-1 pb-3 sm:px-2">
      {/* ── selamlama ── */}
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-lg leading-tight sm:text-xl">
          <span className="text-quince">
            <GreetingIcon icon={greeting.icon} />
          </span>
          <span className="truncate">
            {greeting.text} {name}
          </span>
        </h1>
        <p className="mt-0.5 hidden truncate text-sm text-muted sm:block">
          {lineOfTheDay()}
        </p>
      </div>

      {/* ── hafta gezinmesi ── */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Önceki hafta"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronLeft size={17} strokeWidth={1.75} />
        </button>

        <div className="flex min-w-0 flex-col items-center px-1">
          <span className="numerals text-center text-sm whitespace-nowrap sm:text-base">
            {weekRangeLabel(dates)}
          </span>
          <AnimatePresence initial={false}>
            {weekOffset !== 0 && (
              <motion.button
                type="button"
                onClick={onToday}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden text-xs text-quince underline decoration-quince/40 underline-offset-2 hover:decoration-quince"
              >
                Bugüne dön
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={onNext}
          aria-label="Sonraki hafta"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <ChevronRight size={17} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── haftalık ilerleme + profil ── */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onOpenSummary}
          title="Hafta özeti"
          aria-label={`Hafta özeti — ${done} / ${total} görev tamam`}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-surface"
        >
          <Ring value={total ? done / total : 0} empty={total === 0} size={24} />
          <span className="numerals hidden text-sm text-muted sm:block">
            {total ? `%${percent}` : "—"}
          </span>
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Profil menüsü"
            aria-expanded={menuOpen}
            className={cn(
              "grid size-8 place-items-center rounded-full border text-sm transition-colors",
              menuOpen
                ? "border-quince bg-quince-wash"
                : "border-rule-strong hover:border-ink/40 hover:bg-surface",
            )}
          >
            <span className="numerals">{name.slice(0, 1).toUpperCase()}</span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -2, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-lg border border-rule bg-raised shadow-lift"
              >
                <div className="border-b border-rule px-3.5 py-3">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="truncate text-xs text-muted">{email}</p>
                  {localMode && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-2xs text-quince">
                      <CloudOff size={11} strokeWidth={1.75} />
                      Yerel mod — veri bu tarayıcıda
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-sunk"
                >
                  <Settings size={14} strokeWidth={1.75} className="text-muted" />
                  Ayarlar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onSignOut();
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors hover:bg-sunk"
                >
                  <LogOut size={14} strokeWidth={1.75} className="text-muted" />
                  Çıkış yap
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
