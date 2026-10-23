"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  /** Başlığın altında küçük açıklama — gerekiyorsa. */
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md";
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "sm",
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], input, textarea, button",
    );
    focusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 flex justify-end">
          <motion.button
            type="button"
            aria-label="Paneli kapat"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 cursor-default bg-ink/20 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex h-full w-full flex-col border-l border-rule bg-surface shadow-lift-strong ${
              width === "md" ? "sm:w-[30rem]" : "sm:w-[23rem]"
            }`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-6 pb-4">
              <div>
                <h2 className="text-xl">{title}</h2>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="-mt-1 -mr-2 rounded-md p-2 text-muted transition-colors hover:bg-sunk hover:text-ink"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {children}
            </div>

            {footer && (
              <footer className="border-t border-rule px-6 py-4">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
