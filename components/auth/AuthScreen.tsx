"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CloudOff } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authErrorMessage } from "@/lib/firebase/client";
import { dayOfMonth, isToday, weekDates } from "@/lib/date";
import { useIsClient } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

/* Gün adları konuma bağlı, tarihe değil — sunucuda da aynı. Rakamlar ve
   "bugün hangisi" bilgisi yalnızca tarayıcıda, useIsClient'tan sonra. */
const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/**
 * Yedi günlük şerit, pusulanın kadranı. Üstündeki ince altın ibre bugünü
 * gösteriyor ve açılışta yerine oturuyor — sayfadaki tek kendiliğinden
 * hareket bu.
 */
function CompassDial() {
  const isClient = useIsClient();
  const reduce = useReducedMotion();
  const dates = useMemo(() => (isClient ? weekDates(new Date(), 1) : null), [isClient]);
  const todayIndex = dates?.findIndex(isToday) ?? -1;

  return (
    <div className="relative">
      {/* İbre şeridin altında duruyor: kartın overflow-hidden'ı üst kenarın
          dışındaki her şeyi kırpıyor. Tepesi çizgiye değiyor ve o noktadan
          dönüyor — yerine oturan bir pusula ibresi gibi. */}
      <AnimatePresence>
        {todayIndex >= 0 && (
          <motion.span
            key="needle"
            aria-hidden
            initial={reduce ? { opacity: 0 } : { rotate: -24, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { rotate: 0, opacity: 1 }}
            transition={
              reduce
                ? { duration: 0.2 }
                : { type: "spring", stiffness: 150, damping: 10, delay: 0.4 }
            }
            style={{
              left: `${((todayIndex + 0.5) / 7) * 100}%`,
              transformOrigin: "50% 0%",
            }}
            className="absolute top-full z-10 -ml-[5px] h-[9px] w-[10px]"
          >
            <svg viewBox="0 0 10 9" className="size-full">
              <path d="M5 0 L0 9 L10 9 Z" fill="var(--quince)" />
            </svg>
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex border-b border-rule">
        {DAY_NAMES.map((name, i) => {
          const date = dates?.[i];
          const today = i === todayIndex;
          return (
            <div
              key={name}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 border-r border-rule py-2.5 last:border-r-0",
                today && "today-light",
              )}
            >
              <span className={cn("text-2xs", today ? "text-ink" : "text-faint")}>
                {name}
              </span>
              <span
                className={cn(
                  "numerals text-sm leading-none transition-opacity duration-500",
                  today ? "text-quince" : "text-muted",
                  date ? "opacity-100" : "opacity-0",
                )}
              >
                {/* Yer tutucu: hidrasyondan önce de satır yüksekliği aynı kalsın */}
                {date ? dayOfMonth(date) : "0"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
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

function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.58 9.08 7.3c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.57 4.1ZM12.06 7.25C11.91 5.02 13.72 3.18 15.8 3c.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

export function AuthScreen() {
  const { mode, signInGoogle, signInApple, startLocal } = useAuth();
  const local = mode === "local";

  const [name, setName] = useState("");
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      /* Ham kodu da gösteriyoruz. Sağlayıcı yapılandırması bozulduğunda
         (Apple anahtarı, Team ID, yetkili alan adı) kullanıcı dostu cümle
         tek başına çıkmaza sokuyor; kodu görmek sorunu bulmanın en kısa yolu. */
      console.error("Pusula giriş hatası:", e);
      setError({ text: authErrorMessage(code), code });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center overflow-y-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        <div className="overflow-hidden rounded-xl border border-rule bg-surface shadow-lift">
          <CompassDial />

          <div className="px-7 pt-10 pb-8">
            <h1 className="text-center text-4xl leading-none">Pusula</h1>
            <p className="mt-3.5 text-center text-sm text-muted">
              Haftanı tek sayfada tut.
            </p>

            {local ? (
              <div className="mt-7 flex flex-col gap-4">
                <div className="flex items-start gap-2.5 rounded-md bg-quince-wash px-3 py-2.5">
                  <CloudOff
                    size={14}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0 text-quince"
                  />
                  <p className="text-xs leading-relaxed text-ink/80">
                    Firebase bağlı değil. Yerel modda hemen başlayabilirsin;
                    veri yalnızca bu tarayıcıda durur.
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
                    onKeyDown={(e) =>
                      e.key === "Enter" && void run(() => startLocal(name))
                    }
                    placeholder="Ferhat"
                    autoComplete="given-name"
                    className="mt-1.5 w-full rounded-md border border-rule bg-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-quince"
                  />
                </div>

                <Button
                  variant="solid"
                  disabled={busy}
                  onClick={() => void run(() => startLocal(name))}
                >
                  Yerel modda başla
                </Button>
              </div>
            ) : (
              <div className="mt-9 flex flex-col gap-3">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void run(signInGoogle)}
                  className="w-full gap-3 bg-raised py-3 text-base hover:bg-raised"
                >
                  <GoogleMark />
                  Google ile devam et
                </Button>

                <Button
                  variant="solid"
                  disabled={busy}
                  onClick={() => void run(signInApple)}
                  className="w-full gap-3 py-3 text-base"
                >
                  <AppleMark />
                  Apple ile devam et
                </Button>

                <p className="mt-1 text-center text-xs leading-relaxed text-faint">
                  Planın giriş yaptığın hesaba bağlı kalır, yalnızca sen görürsün.
                </p>
              </div>
            )}

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  role="alert"
                  className="mt-5 rounded-md border border-brick/35 bg-brick/8 px-3 py-2 text-xs leading-relaxed text-brick"
                >
                  <p>{error.text}</p>
                  {error.code && (
                    <p className="mt-1 font-mono text-2xs break-all text-brick/70">
                      {error.code}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
