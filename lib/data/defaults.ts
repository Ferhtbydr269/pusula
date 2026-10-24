import type {
  Category,
  DailyTracking,
  ISODate,
  Settings,
} from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "ders", name: "Ders Çalışma", color: "petrol", order: 0 },
  { id: "ingilizce", name: "İngilizce", color: "plum", order: 1 },
  { id: "proje", name: "Proje/Ödev", color: "ochre", order: 2 },
  { id: "spor", name: "Spor", color: "moss", order: 3 },
  { id: "kisisel", name: "Kişisel", color: "clay", order: 4 },
  { id: "sosyal", name: "Sosyal", color: "slate", order: 5 },
];

export const DEFAULT_SETTINGS: Settings = {
  displayName: "",
  theme: "system",
  postponeLimit: 2,
  weekStartsOn: 1,
  goals: {
    // Su bardakla sayılır, arayüzde litre görünür: 8 bardak = 2 L.
    water: 8,
    movement: 30,
    sleep: 8,
    // Okuma ve odak için hedef dayatmıyoruz; sıfır "kendin belirle" demek ve
    // bu ikisi hedef verilene kadar günün listesine düşmez.
    reading: 0,
    focus: 0,
  },
  tracking: {
    water: true,
    movement: true,
    sleep: true,
    reading: true,
    focus: true,
    mood: true,
    note: true,
  },
};

export function emptyTracking(date: ISODate): DailyTracking {
  return {
    date,
    waterGlasses: 0,
    movementMin: 0,
    sleepHours: 0,
    readingMin: 0,
    focusMin: 0,
    mood: null,
    note: "",
  };
}

/** Eksik alanları varsayılanla tamamlar — eski kayıtlar da açılsın. */
export function normalizeSettings(raw: unknown): Settings {
  const s = (raw ?? {}) as Partial<Settings>;
  return {
    displayName: typeof s.displayName === "string" ? s.displayName.trim() : "",
    theme: s.theme ?? DEFAULT_SETTINGS.theme,
    postponeLimit:
      typeof s.postponeLimit === "number" && s.postponeLimit >= 0
        ? s.postponeLimit
        : DEFAULT_SETTINGS.postponeLimit,
    weekStartsOn: s.weekStartsOn === 0 ? 0 : 1,
    goals: { ...DEFAULT_SETTINGS.goals, ...(s.goals ?? {}) },
    tracking: { ...DEFAULT_SETTINGS.tracking, ...(s.tracking ?? {}) },
  };
}
