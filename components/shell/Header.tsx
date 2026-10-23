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

/** Sağlayıcının profil fotoğrafı; yoksa baş harfe düşer. */
function Avatar({
  photoURL,
  name,
  size,
}: {
  photoURL: string | null;
  name: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);

  if (photoURL && !failed) {
    return (
      /* Sağlayıcı avatarını next/image üzerinden geçirmenin faydası yok: zaten
         küçük ve boyutlandırılmış geliyor, üstelik optimizasyon katmanı hız
         sınırına takılıp kırık resim bırakabiliyor. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="size-full rounded-full object-cover"
      />
    );
  }

  return (
    <span className="numerals text-sm">{name.slice(0, 1).toUpperCase()}</span>
  );
}

interface HeaderProps {
  /** Selamlamada kullanılan kısa ad. */
  name: string;
  /** Profil menüsünde görünen tam ad. */
  fullName: string;
  photoURL: string | null;
  greeting: { text: string; icon: "dawn" | "day" | "dusk" | "night" };
  dates: ISODate[];
  weekOffset: number;
  percent: number;
  done: number;
  total: number;
  email: string;
  localMode: boolean;
  canLinkApple: boolean;
  onPrev(): void;
  onNext(): void;
  onToday(): void;
  onOpenSummary(): void;
  onOpenSettings(): void;
  onLinkApple(): void;
  onSignOut(): void;
}

export function Header({
  name,
  fullName,
  photoURL,
  greeting,
  dates,
  weekOffset,
  percent,
  done,
  total,
  email,
  localMode,
  canLinkApple,
  onPrev,
  onNext,
  onToday,
  onOpenSummary,
  onOpenSettings,
  onLinkApple,
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
    // Dar ekranda selamlama kırpılmasın diye hafta gezinmesi alt satıra
    // iniyor; sm'den itibaren üçü tek satırda.
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1 pb-3 sm:flex-nowrap sm:items-start sm:gap-4 sm:px-2">
      {/* ── selamlama ── */}
      <div className="order-1 min-w-0 flex-1 sm:flex-none">
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
      <div className="order-3 flex w-full shrink-0 items-center justify-center gap-1 sm:order-2 sm:w-auto">
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
      <div className="order-2 flex shrink-0 items-center gap-1 sm:order-3">
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
              "grid size-8 place-items-center overflow-hidden rounded-full border transition-colors",
              menuOpen
                ? "border-quince bg-quince-wash"
                : "border-rule-strong hover:border-ink/40 hover:bg-surface",
            )}
          >
            <Avatar photoURL={photoURL} name={fullName} size={32} />
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
                <div className="flex items-center gap-3 border-b border-rule px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-rule-strong">
                    <Avatar photoURL={photoURL} name={fullName} size={36} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{fullName}</p>
                    <p className="truncate text-xs text-muted">{email}</p>
                  </div>
                </div>
                {localMode && (
                  <p className="flex items-center gap-1.5 border-b border-rule px-3.5 py-2 text-2xs text-quince">
                    <CloudOff size={11} strokeWidth={1.75} />
                    Yerel mod — veri bu tarayıcıda
                  </p>
                )}
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
                {canLinkApple && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onLinkApple();
                    }}
                    className="flex w-full items-center gap-2.5 border-t border-rule px-3.5 py-2.5 text-sm transition-colors hover:bg-sunk"
                  >
                    Apple hesabını bağla
                  </button>
                )}
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
