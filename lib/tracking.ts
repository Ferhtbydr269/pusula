import type { DailyTracking, Settings } from "@/lib/data/types";

/** Bir bardak su. Sayaç bardakla çalışıyor, arayüz litre konuşuyor. */
export const GLASS_ML = 250;

export function glassesToLitres(glasses: number): number {
  return (glasses * GLASS_ML) / 1000;
}

export function litresToGlasses(litres: number): number {
  return Math.round((litres * 1000) / GLASS_ML);
}

/** 1.5 → "1,5" — Türkçe ondalık ayracı virgül. */
export function trNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, "").replace(".", ",");
}

export function formatLitres(litres: number): string {
  return `${trNumber(litres)} L`;
}

export function formatMinutesShort(min: number): string {
  if (min >= 60) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h} sa ${m} dk` : `${h} sa`;
  }
  return `${min} dk`;
}

export type NumericTrackingKey = "water" | "movement" | "sleep" | "reading" | "focus";

export interface MetricDef {
  key: NumericTrackingKey;
  label: string;
  /** Günlük takip kaydındaki sayısal alan. */
  field: "waterGlasses" | "movementMin" | "sleepHours" | "readingMin" | "focusMin";
  goalKey: keyof Settings["goals"];
  /** Artır/azalt adımı. */
  step: number;
  /**
   * Sıfırdan ilk artırışta sıçranacak değer. Kimse yarım saat uyumuyor ya da
   * beş dakika yürümüyor; sayacı sıfırdan tek tek tırmandırmak eziyet.
   */
  startAt: number;
  /** Panelde ve hedef satırında görünen biçim. */
  format(value: number): string;
  /** Hedef sıfırsa "kendin belirle" demek. */
  goalOf(settings: Settings): number;
}

export const METRICS: MetricDef[] = [
  {
    key: "water",
    label: "Su",
    field: "waterGlasses",
    goalKey: "water",
    step: 1,
    startAt: 1,
    format: (glasses) => formatLitres(glassesToLitres(glasses)),
    goalOf: (s) => s.goals.water,
  },
  {
    key: "movement",
    label: "Hareket",
    field: "movementMin",
    goalKey: "movement",
    step: 5,
    startAt: 10,
    format: formatMinutesShort,
    goalOf: (s) => s.goals.movement,
  },
  {
    key: "sleep",
    label: "Uyku",
    field: "sleepHours",
    goalKey: "sleep",
    step: 0.5,
    startAt: 6,
    format: (h) => `${trNumber(h)} sa`,
    goalOf: (s) => s.goals.sleep,
  },
  {
    key: "reading",
    label: "Okuma",
    field: "readingMin",
    goalKey: "reading",
    step: 5,
    startAt: 10,
    format: formatMinutesShort,
    goalOf: (s) => s.goals.reading,
  },
  {
    key: "focus",
    label: "Odak süresi",
    field: "focusMin",
    goalKey: "focus",
    step: 15,
    startAt: 25,
    format: formatMinutesShort,
    goalOf: (s) => s.goals.focus,
  },
];

/** Sıfırdan ilk artış startAt'e sıçrar, sonrası normal adım. */
export function nextValue(metric: MetricDef, current: number): number {
  if (current <= 0) return metric.startAt;
  return current + metric.step;
}

export function prevValue(metric: MetricDef, current: number): number {
  if (current <= metric.startAt) return 0;
  return Math.max(0, current - metric.step);
}

/** O güne eli değmiş mi: herhangi bir sayaç, ruh hali ya da not. */
export function hasAnyTracking(tracking: DailyTracking): boolean {
  return (
    METRICS.some((m) => tracking[m.field] > 0) ||
    tracking.mood !== null ||
    tracking.note.trim().length > 0
  );
}

export interface DayGoal {
  metric: MetricDef;
  value: number;
  goal: number;
  reached: boolean;
}

/**
 * O gün için gösterilecek hedefler: ayarlarda açık olan ve bir hedef sayısı
 * girilmiş takipler. Hedefi sıfır olanlar (kullanıcı kendi belirlesin
 * dedikleri) listeye düşmez.
 */
export function goalsForDay(
  tracking: DailyTracking,
  settings: Settings,
): DayGoal[] {
  const out: DayGoal[] = [];
  for (const metric of METRICS) {
    if (!settings.tracking[metric.key]) continue;
    const goal = metric.goalOf(settings);
    if (goal <= 0) continue;
    const value = tracking[metric.field];
    out.push({ metric, value, goal, reached: value >= goal });
  }
  return out;
}
