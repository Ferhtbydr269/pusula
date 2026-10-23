import { isoWeekday } from "@/lib/date";
import type { ISODate, Series, Task } from "./types";

/** Sabit kimlik: aynı seri + aynı gün her zaman aynı dokümana yazılır. */
export function seriesTaskId(seriesId: string, date: ISODate): string {
  return `${seriesId}__${date}`;
}

export function seriesHitsDate(series: Series, date: ISODate): boolean {
  if (!series.active) return false;
  if (date < series.startDate) return false;
  if (series.skips.includes(date)) return false;

  const wd = isoWeekday(date);
  switch (series.recurrence.kind) {
    case "daily":
      return true;
    case "weekdays":
      return wd <= 5;
    case "days":
      return series.recurrence.days.includes(wd);
  }
}

/**
 * Görünen haftada olması gereken ama henüz yazılmamış seri görevlerini üretir.
 * Haftaya girildiğinde çağrılır; var olanlara dokunmaz, böylece kullanıcının
 * o güne özel yaptığı düzenlemeler (saat değişikliği, tamamlama) korunur.
 */
export function materializeSeries(
  seriesList: Series[],
  dates: ISODate[],
  existingTaskIds: Set<string>,
  now = Date.now(),
): Task[] {
  const created: Task[] = [];

  for (const series of seriesList) {
    for (const date of dates) {
      if (!seriesHitsDate(series, date)) continue;
      const id = seriesTaskId(series.id, date);
      if (existingTaskIds.has(id)) continue;

      created.push({
        id,
        title: series.title,
        note: series.note,
        categoryId: series.categoryId,
        date,
        startTime: series.startTime,
        durationMin: series.durationMin,
        priority: series.priority,
        status: "todo",
        postponeCount: 0,
        originalDate: date,
        seriesId: series.id,
        completedAt: null,
        createdAt: now,
        order: series.startTime ? timeToOrder(series.startTime) : 500,
      });
    }
  }

  return created;
}

/** Saatli görevler gün içinde saatine göre sıralanır. */
export function timeToOrder(time: string): number {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return 500;
  return h * 60 + (m || 0);
}

export function recurrenceLabel(recurrence: Series["recurrence"]): string {
  switch (recurrence.kind) {
    case "daily":
      return "Her gün";
    case "weekdays":
      return "Hafta içi";
    case "days": {
      const names = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
      return recurrence.days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => names[d - 1])
        .join(", ");
    }
  }
}
