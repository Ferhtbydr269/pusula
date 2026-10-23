import {
  addDays,
  differenceInCalendarDays,
  format,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import type { ISODate, Weekday } from "@/lib/data/types";

const loc = { locale: tr };

/** Yerel saate göre "YYYY-MM-DD" — UTC kaymasına izin vermiyoruz. */
export function toISO(date: Date): ISODate {
  return format(date, "yyyy-MM-dd");
}

export function fromISO(iso: ISODate): Date {
  return parseISO(iso);
}

export function todayISO(): ISODate {
  return toISO(new Date());
}

/** Görünen haftanın 7 günü, hafta başlangıcı ayardan gelir. */
export function weekDates(anchor: Date, weekStartsOn: 0 | 1): ISODate[] {
  const start = startOfWeek(anchor, { weekStartsOn });
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(start, i)));
}

export function shiftWeek(anchor: Date, weeks: number): Date {
  return addDays(anchor, weeks * 7);
}

/** "19 – 25 Ekim 2026", ay veya yıl değişirse kendini uzatır. */
export function weekRangeLabel(dates: ISODate[]): string {
  const first = fromISO(dates[0]);
  const last = fromISO(dates[dates.length - 1]);

  if (isSameMonth(first, last)) {
    return `${format(first, "d", loc)} – ${format(last, "d MMMM yyyy", loc)}`;
  }
  if (isSameYear(first, last)) {
    return `${format(first, "d MMMM", loc)} – ${format(last, "d MMMM yyyy", loc)}`;
  }
  return `${format(first, "d MMMM yyyy", loc)} – ${format(last, "d MMMM yyyy", loc)}`;
}

export function dayNameLong(iso: ISODate): string {
  return format(fromISO(iso), "EEEE", loc);
}

/** "Pzt", "Sal" … — date-fns'in kısaltması uzun geldiği için kendimiz veriyoruz. */
const SHORT_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

export function dayNameShort(iso: ISODate): string {
  return SHORT_DAYS[fromISO(iso).getDay()];
}

export function dayOfMonth(iso: ISODate): string {
  return format(fromISO(iso), "d");
}

export function monthShort(iso: ISODate): string {
  return format(fromISO(iso), "MMM", loc);
}

export function isoWeekday(iso: ISODate): Weekday {
  const d = fromISO(iso).getDay();
  return (d === 0 ? 7 : d) as Weekday;
}

export function isToday(iso: ISODate): boolean {
  return iso === todayISO();
}

export function isPastDay(iso: ISODate): boolean {
  return differenceInCalendarDays(fromISO(iso), new Date()) < 0;
}

export function isFutureDay(iso: ISODate): boolean {
  return differenceInCalendarDays(fromISO(iso), new Date()) > 0;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return differenceInCalendarDays(fromISO(b), fromISO(a));
}

export function addDaysISO(iso: ISODate, days: number): ISODate {
  return toISO(addDays(fromISO(iso), days));
}

export function longDateLabel(iso: ISODate): string {
  return format(fromISO(iso), "d MMMM EEEE", loc);
}

/** Saat 14:00'te açınca "Günaydın" demesin. */
export function greeting(now = new Date()): { text: string; icon: "dawn" | "day" | "dusk" | "night" } {
  const h = now.getHours();
  if (h < 6) return { text: "İyi geceler", icon: "night" };
  if (h < 11) return { text: "Günaydın", icon: "dawn" };
  if (h < 18) return { text: "İyi günler", icon: "day" };
  if (h < 22) return { text: "İyi akşamlar", icon: "dusk" };
  return { text: "İyi geceler", icon: "night" };
}

/** Güne sabitlenmiş not — her yenilemede değişip dikkat dağıtmasın. */
const DAILY_LINES = [
  "Küçük başla, akşama kadar büyür.",
  "Bugün bir tek şeyi bitir, o yeter.",
  "Listeyi kısaltmak da ilerlemektir.",
  "Zor olanı en başa al.",
  "Yarım saat, hiç yoktan iyidir.",
  "Dünden bir adım önde olmak kâfi.",
  "Not aldığın şey akıldan çıkmaz.",
  "Ara vermek de planın parçası.",
  "Bitmemiş iş, başlanmamış işten iyidir.",
  "Bugünü dürüst doldur, hafta kendini toplar.",
  "Hevesi değil, sırayı takip et.",
  "Üç satır yaz, sonra devam gelir.",
  "Erteleme hakkını akıllı harca.",
  "Akşam kendine teşekkür edeceksin.",
];

export function lineOfTheDay(iso: ISODate = todayISO()): string {
  let sum = 0;
  for (let i = 0; i < iso.length; i++) sum += iso.charCodeAt(i) * (i + 1);
  return DAILY_LINES[sum % DAILY_LINES.length];
}
