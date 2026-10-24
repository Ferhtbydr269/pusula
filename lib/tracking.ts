import type {
  DailyTracking,
  ISODate,
  NumericTrackingKey,
  Settings,
} from "@/lib/data/types";

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

// Tanım types.ts'te duruyor; buradan da kullanılabilsin diye yeniden veriliyor.
export type { NumericTrackingKey };

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
  /** Panelde görünen uzun biçim: "20 dk", "1,5 sa", "0,75 L". */
  format(value: number): string;
  /** Birim kısaltması — dar hedef satırında tek kez yazılır. */
  unit: string;
  /** Sayaç değerini gösterilecek sayıya çevirir (su: bardak → litre). */
  toNumber(value: number): number;
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
    unit: "L",
    toNumber: glassesToLitres,
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
    unit: "dk",
    toNumber: (v) => v,
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
    unit: "sa",
    toNumber: (v) => v,
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
    unit: "dk",
    toNumber: (v) => v,
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
    unit: "dk",
    toNumber: (v) => v,
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

/**
 * Dar gün sütunu için sıkışık biçim: "20/30 dk", "0,75/2 L".
 * Uzun biçimde ("20 dk / 30 dk") etiket kırpılıyordu ve "Hareket" yerine
 * "H..." kalıyordu — etiketlemenin bütün amacı kaçıyordu.
 */
export function formatPair(metric: MetricDef, value: number, goal: number): string {
  return `${trNumber(metric.toNumber(value))}/${trNumber(metric.toNumber(goal))} ${metric.unit}`;
}

export interface HabitDay {
  date: ISODate;
  value: number;
  reached: boolean;
  /** Gün geldi mi — gelmemiş günler "tutturulamadı" sayılmaz. */
  elapsed: boolean;
}

export interface HabitWeek {
  metric: MetricDef;
  goal: number;
  days: HabitDay[];
  /** Hedefi tutturduğun gün sayısı. */
  hitDays: number;
  /** Değerlendirmeye giren gün sayısı (geçmiş haftada 7). */
  elapsedDays: number;
  /** Geçen günlerin ortalaması, metriğin kendi biriminde. */
  average: number;
}

/**
 * Haftanın alışkanlık tablosu: her takip için gün gün tutturdun mu, kaç gün
 * tutturdun ve ortalaman ne. Hafta özetinin asıl anlatacağı şey bu — iki
 * ortalama sayı haftanın nasıl geçtiğini anlatmıyordu.
 */
export function weekHabits(
  dates: ISODate[],
  trackingByDate: Record<ISODate, DailyTracking>,
  settings: Settings,
  today: ISODate,
): HabitWeek[] {
  const out: HabitWeek[] = [];

  for (const metric of METRICS) {
    if (!settings.tracking[metric.key]) continue;
    const goal = metric.goalOf(settings);
    if (goal <= 0) continue;

    const days: HabitDay[] = dates.map((date) => {
      const value = trackingByDate[date]?.[metric.field] ?? 0;
      return { date, value, reached: value >= goal, elapsed: date <= today };
    });

    const elapsed = days.filter((d) => d.elapsed);
    const total = elapsed.reduce((n, d) => n + metric.toNumber(d.value), 0);

    out.push({
      metric,
      goal,
      days,
      hitDays: elapsed.filter((d) => d.reached).length,
      elapsedDays: elapsed.length,
      average: elapsed.length ? total / elapsed.length : 0,
    });
  }

  return out;
}

/** Ortalamayı metriğin birimiyle yazar: "1,8 L", "26 dk". */
export function formatAverage(habit: HabitWeek): string {
  const rounded =
    habit.metric.unit === "dk"
      ? Math.round(habit.average)
      : Math.round(habit.average * 10) / 10;
  return `${trNumber(rounded)} ${habit.metric.unit}`;
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
    // Listeye düşmesi için üçü birden gerekli: takip açık, hedef girilmiş ve
    // kullanıcı o hedefi listede görmeyi seçmiş.
    if (!settings.tracking[metric.key]) continue;
    if (!settings.goalsInList?.[metric.key]) continue;
    const goal = metric.goalOf(settings);
    if (goal <= 0) continue;
    const value = tracking[metric.field];
    out.push({ metric, value, goal, reached: value >= goal });
  }
  return out;
}
