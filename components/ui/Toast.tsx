"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { newId } from "@/lib/utils";

interface ToastAction {
  label: string;
  run: () => void | Promise<void>;
}

interface ToastItem {
  id: string;
  message: string;
  action?: ToastAction;
}

interface ToastContextValue {
  toast(message: string, action?: ToastAction): void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, action?: ToastAction) => {
      const id = newId("toast");
      setItems((prev) => [...prev.slice(-2), { id, message, action }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), action ? 6000 : 3200),
      );
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-70 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex items-center gap-3 rounded-lg border border-rule bg-raised px-4 py-2.5 text-sm shadow-lift"
            >
              <span>{item.message}</span>
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    void item.action?.run();
                    dismiss(item.id);
                  }}
                  className="font-medium text-quince underline decoration-quince/40 underline-offset-2 hover:decoration-quince"
                >
                  {item.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}
