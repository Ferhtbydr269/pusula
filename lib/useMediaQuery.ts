"use client";

import { useSyncExternalStore } from "react";

/**
 * Hafta görünümünün iki düzeni (yedi sütun / tek gün) CSS ile gizlenseydi
 * ikisi birden DOM'da dururdu: aynı görevler iki kez, klavye kısayolları
 * yanlış düğmeyi bulur. Bu yüzden hangisinin basılacağına burada karar
 * veriyoruz.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/** Tailwind'deki `lg` kırılımıyla aynı yer. */
export function useIsWideScreen(): boolean {
  return useMediaQuery("(min-width: 1024px)", true);
}
