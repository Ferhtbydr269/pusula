"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authErrorMessage } from "@/lib/firebase/client";
import { dayNameShort, dayOfMonth, isToday, weekDates } from "@/lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type Mode = "signIn" | "signUp";

const fieldClass =
  "w-full rounded-md border border-rule bg-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-quince";

/** Sayfanın üst kenarındaki yedi gün sekmesi: içeride ne olduğunun küçük sözü. */
function WeekTabs() {
  const dates = useMemo(() => weekDates(new Date(), 1), []);
  return (
    <div className="flex border-b border-rule" aria-hidden>
      {dates.map((date) => {
        const today = isToday(date);
        return (
          <div
            key={date}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 border-r border-rule py-2 last:border-r-0",
              today && "today-light",
            )}
          >
            <span
              className={cn("text-2xs", today ? "text-ink" : "text-faint")}
            >
              {dayNameShort(date)}
            </span>
            <span
              className={cn(
                "numerals text-sm leading-none",
                today ? "text-quince" : "text-muted",
              )}
            >
              {dayOfMonth(date)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthScreen() {
  const { mode: authMode, signInEmail, signUpEmail, signInGoogle, startLocal } =
    useAuth();
  const local = authMode === "local";

  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? (e as { code: unknown }).code
          : undefined;
      setError(authErrorMessage(code));
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (local) {
      void run(() => startLocal(name || "Sen"));
      return;
    }
    if (mode === "signIn") {
      void run(() => signInEmail(email, password));
    } else {
      void run(() => signUpEmail(name, email, password));
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center overflow-y-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="px-1 text-center">
          <h1 className="text-2xl">Haftalık Planlayıcı</h1>
          <p className="mt-1.5 text-sm text-muted">
            Haftanın yedi günü tek sayfada.
          </p>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-rule bg-surface shadow-lift">
          <WeekTabs />

          <div className="px-6 pt-6 pb-7">
            {local ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 rounded-md bg-quince-wash px-3 py-2.5">
                  <CloudOff
                    size={14}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-quince"
                  />
                  <p className="text-xs leading-relaxed text-ink/80">
                    Firebase henüz bağlı değil. Yerel modda planını hemen
                    kurabilirsin; veri yalnızca bu tarayıcıda durur ve başka
                    cihazlara geçmez.
                  </p>
                </div>

                <div>
                  <label htmlFor="local-name" className="text-sm text-muted">
                    Adın
                  </label>
                  <input
                    id="local-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder="Ferhat"
                    autoComplete="given-name"
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </div>

                <Button variant="solid" disabled={busy} onClick={submit}>
                  Yerel modda başla
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <AnimatePresence initial={false} mode="popLayout">
                  {mode === "signUp" && (
                    <motion.div
                      key="name"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <label htmlFor="auth-name" className="text-sm text-muted">
                        Adın
                      </label>
                      <input
                        id="auth-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ferhat"
                        autoComplete="given-name"
                        className={cn(fieldClass, "mt-1.5")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label htmlFor="auth-email" className="text-sm text-muted">
                    E-posta
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className={cn(fieldClass, "mt-1.5")}
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="text-sm text-muted">
                    Şifre
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    autoComplete={
                      mode === "signUp" ? "new-password" : "current-password"
                    }
                    className={cn(fieldClass, "mt-1.5")}
                  />
                  {mode === "signUp" && (
                    <p className="mt-1.5 text-xs text-faint">En az 6 karakter.</p>
                  )}
                </div>

                <Button variant="solid" disabled={busy} onClick={submit}>
                  {mode === "signIn" ? "Giriş yap" : "Hesap oluştur"}
                </Button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-rule" />
                  <span className="text-xs text-faint">veya</span>
                  <span className="h-px flex-1 bg-rule" />
                </div>

                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(signInGoogle)}
                  className="bg-raised"
                >
                  <GoogleMark />
                  Google ile devam et
                </Button>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="mt-4 rounded-md border border-brick/35 bg-brick/8 px-3 py-2 text-xs leading-relaxed text-brick"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {!local && (
            <div className="border-t border-rule px-6 py-3.5 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signIn" ? "signUp" : "signIn");
                  setError(null);
                }}
                className="text-xs text-muted transition-colors hover:text-ink"
              >
                {mode === "signIn" ? (
                  <>
                    Hesabın yok mu?{" "}
                    <span className="text-quince underline decoration-quince/40 underline-offset-2">
                      Kayıt ol
                    </span>
                  </>
                ) : (
                  <>
                    Zaten hesabın var mı?{" "}
                    <span className="text-quince underline decoration-quince/40 underline-offset-2">
                      Giriş yap
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
