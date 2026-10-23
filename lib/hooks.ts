"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Sunucuda false, hidrasyondan sonra true.
 * Tarihe bağlı her şey (bugün hangi gün, ayın kaçı) buna bakmalı: sayfa
 * derleme anında statik üretildiği için sunucunun gördüğü "bugün" eskimiş
 * olur ve ziyaretçiye bir an yanlış tarih gösterilirdi.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

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

/**
 * Hafta görünümünün iki düzeni (yedi sütun / tek gün) CSS ile gizlenseydi
 * ikisi birden DOM'da dururdu: aynı görevler iki kez, klavye kısayolları
 * yanlış düğmeyi bulur. Bu yüzden hangisinin basılacağına burada karar
 * veriyoruz. Tailwind'deki `lg` kırılımıyla aynı yer.
 */
export function useIsWideScreen(): boolean {
  return useMediaQuery("(min-width: 1024px)", true);
}
