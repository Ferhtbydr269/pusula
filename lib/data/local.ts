import { addDaysISO, todayISO } from "@/lib/date";
import { newId } from "@/lib/utils";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, emptyTracking, normalizeSettings } from "./defaults";
import { timeToOrder } from "./series";
import type {
  Category,
  DailyTracking,
  ExportBundle,
  ISODate,
  NewTask,
  PlannerRepo,
  Profile,
  Series,
  Settings,
  Task,
  Unsubscribe,
} from "./types";

const STORAGE_KEY = "hp-local-db";

interface LocalDb {
  profile: Profile | null;
  settings: Settings;
  categories: Category[];
  series: Series[];
  tasks: Record<string, Task>;
  tracking: Record<ISODate, DailyTracking>;
}

function freshDb(): LocalDb {
  return {
    profile: null,
    settings: { ...DEFAULT_SETTINGS },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    series: [],
    tasks: {},
    tracking: {},
  };
}

/**
 * Firebase anahtarları yokken geliştirmeyi bloklamayan yerel mod.
 * Veri tarayıcıda (localStorage) durur, cihazlar arası eşitlenmez.
 */
export class LocalRepo implements PlannerRepo {
  readonly mode = "local" as const;

  private db: LocalDb;
  private settingsListeners = new Set<(s: Settings) => void>();
  private categoryListeners = new Set<(c: Category[]) => void>();
  private seriesListeners = new Set<(s: Series[]) => void>();
  private taskListeners = new Set<{ dates: ISODate[]; cb: (t: Task[]) => void }>();
  private trackingListeners = new Set<{
    dates: ISODate[];
    cb: (t: DailyTracking[]) => void;
  }>();

  constructor() {
    this.db = this.read();
  }

  private read(): LocalDb {
    if (typeof window === "undefined") return freshDb();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshDb();
      const parsed = JSON.parse(raw) as Partial<LocalDb>;
      const base = freshDb();
      return {
        profile: parsed.profile ?? base.profile,
        settings: normalizeSettings(parsed.settings),
        categories: parsed.categories?.length ? parsed.categories : base.categories,
        series: parsed.series ?? [],
        tasks: parsed.tasks ?? {},
        tracking: parsed.tracking ?? {},
      };
    } catch {
      return freshDb();
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      /* kota dolduysa sessizce geç — arayüz çalışmaya devam etsin */
    }
  }

  private emitTasks() {
    for (const l of this.taskListeners) l.cb(this.tasksFor(l.dates));
  }

  private emitTracking() {
    for (const l of this.trackingListeners) l.cb(this.trackingFor(l.dates));
  }

  private tasksFor(dates: ISODate[]): Task[] {
    const set = new Set(dates);
    return Object.values(this.db.tasks).filter((t) => set.has(t.date));
  }

  private trackingFor(dates: ISODate[]): DailyTracking[] {
    return dates
      .map((d) => this.db.tracking[d])
      .filter((t): t is DailyTracking => Boolean(t));
  }

  private commit(opts: {
    tasks?: boolean;
    tracking?: boolean;
    settings?: boolean;
    categories?: boolean;
    series?: boolean;
  }) {
    this.persist();
    if (opts.tasks) this.emitTasks();
    if (opts.tracking) this.emitTracking();
    if (opts.settings) for (const cb of this.settingsListeners) cb(this.db.settings);
    if (opts.categories) for (const cb of this.categoryListeners) cb(this.db.categories);
    if (opts.series) for (const cb of this.seriesListeners) cb(this.db.series);
  }

  async bootstrap(profile: Omit<Profile, "createdAt">): Promise<void> {
    const isFirstRun = !this.db.profile;
    this.db.profile = {
      ...profile,
      createdAt: this.db.profile?.createdAt ?? Date.now(),
    };
    if (isFirstRun && Object.keys(this.db.tasks).length === 0) {
      this.seedExample();
    }
    this.commit({ settings: true, categories: true, series: true, tasks: true });
  }

  /** Yerel modda boş ekran yerine denemelik bir hafta. */
  private seedExample() {
    const today = todayISO();
    const examples: Array<[string, string, string | null, string | null]> = [
      ["Veri Yapıları — bölüm 4", "ders", today, "09:30"],
      ["İngilizce kelime (30 dk)", "ingilizce", today, null],
      ["Dönem projesi: arayüz taslağı", "proje", today, "16:00"],
      ["Koşu — 5 km", "spor", addDaysISO(today, 1), "07:30"],
      ["Lineer Cebir ödevi", "proje", addDaysISO(today, 1), null],
      ["Kütüphanede okuma", "kisisel", addDaysISO(today, 2), null],
      ["Kahve — Deniz", "sosyal", addDaysISO(today, 4), "15:00"],
    ];
    for (const [title, categoryId, date, startTime] of examples) {
      const id = newId("t");
      this.db.tasks[id] = {
        id,
        title,
        note: "",
        categoryId,
        date: date!,
        startTime,
        durationMin: null,
        priority: "normal",
        status: "todo",
        postponeCount: 0,
        originalDate: date!,
        seriesId: null,
        completedAt: null,
        createdAt: Date.now(),
        order: startTime ? timeToOrder(startTime) : 500,
      };
    }
    this.db.tracking[today] = {
      ...emptyTracking(today),
      waterGlasses: 3,
      movementMin: 20,
    };
  }

  subscribeSettings(cb: (s: Settings) => void): Unsubscribe {
    this.settingsListeners.add(cb);
    cb(this.db.settings);
    return () => this.settingsListeners.delete(cb);
  }

  subscribeCategories(cb: (c: Category[]) => void): Unsubscribe {
    this.categoryListeners.add(cb);
    cb(this.db.categories);
    return () => this.categoryListeners.delete(cb);
  }

  subscribeSeries(cb: (s: Series[]) => void): Unsubscribe {
    this.seriesListeners.add(cb);
    cb(this.db.series);
    return () => this.seriesListeners.delete(cb);
  }

  subscribeTasks(dates: ISODate[], cb: (t: Task[]) => void): Unsubscribe {
    const entry = { dates, cb };
    this.taskListeners.add(entry);
    cb(this.tasksFor(dates));
    return () => this.taskListeners.delete(entry);
  }

  subscribeTracking(dates: ISODate[], cb: (t: DailyTracking[]) => void): Unsubscribe {
    const entry = { dates, cb };
    this.trackingListeners.add(entry);
    cb(this.trackingFor(dates));
    return () => this.trackingListeners.delete(entry);
  }

  async createTask(input: NewTask): Promise<void> {
    const id = newId("t");
    this.db.tasks[id] = {
      id,
      title: input.title,
      note: input.note ?? "",
      categoryId: input.categoryId ?? null,
      date: input.date,
      startTime: input.startTime ?? null,
      durationMin: input.durationMin ?? null,
      priority: input.priority ?? "normal",
      status: "todo",
      postponeCount: 0,
      originalDate: input.date,
      seriesId: null,
      completedAt: null,
      createdAt: Date.now(),
      order: input.order ?? (input.startTime ? timeToOrder(input.startTime) : 500),
    };
    this.commit({ tasks: true });
  }

  async createSeriesTasks(tasks: Task[]): Promise<void> {
    for (const t of tasks) {
      if (!this.db.tasks[t.id]) this.db.tasks[t.id] = t;
    }
    this.commit({ tasks: true });
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<void> {
    const current = this.db.tasks[id];
    if (!current) return;
    this.db.tasks[id] = { ...current, ...patch };
    this.commit({ tasks: true });
  }

  async deleteTask(id: string): Promise<void> {
    delete this.db.tasks[id];
    this.commit({ tasks: true });
  }

  async upsertTracking(date: ISODate, patch: Partial<DailyTracking>): Promise<void> {
    const current = this.db.tracking[date] ?? emptyTracking(date);
    this.db.tracking[date] = { ...current, ...patch, date };
    this.commit({ tracking: true });
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    this.db.settings = normalizeSettings({ ...this.db.settings, ...patch });
    this.commit({ settings: true });
  }

  async createCategory(input: Omit<Category, "id">): Promise<void> {
    this.db.categories = [...this.db.categories, { ...input, id: newId("c") }];
    this.commit({ categories: true });
  }

  async updateCategory(id: string, patch: Partial<Category>): Promise<void> {
    this.db.categories = this.db.categories.map((c) =>
      c.id === id ? { ...c, ...patch } : c,
    );
    this.commit({ categories: true });
  }

  async deleteCategory(id: string): Promise<void> {
    this.db.categories = this.db.categories.filter((c) => c.id !== id);
    for (const task of Object.values(this.db.tasks)) {
      if (task.categoryId === id) this.db.tasks[task.id] = { ...task, categoryId: null };
    }
    this.commit({ categories: true, tasks: true });
  }

  async createSeries(input: Omit<Series, "id" | "createdAt" | "skips">): Promise<string> {
    const id = newId("s");
    this.db.series = [
      ...this.db.series,
      { ...input, id, skips: [], createdAt: Date.now() },
    ];
    this.commit({ series: true });
    return id;
  }

  async updateSeries(id: string, patch: Partial<Series>): Promise<void> {
    this.db.series = this.db.series.map((s) => (s.id === id ? { ...s, ...patch } : s));
    this.commit({ series: true });
  }

  async deleteSeries(id: string): Promise<void> {
    this.db.series = this.db.series.filter((s) => s.id !== id);
    for (const task of Object.values(this.db.tasks)) {
      if (task.seriesId === id) delete this.db.tasks[task.id];
    }
    this.commit({ series: true, tasks: true });
  }

  async exportAll(): Promise<ExportBundle> {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: this.db.profile
        ? { displayName: this.db.profile.displayName, email: this.db.profile.email }
        : null,
      settings: this.db.settings,
      categories: this.db.categories,
      series: this.db.series,
      tasks: Object.values(this.db.tasks),
      tracking: Object.values(this.db.tracking),
    };
  }

  async importAll(bundle: ExportBundle): Promise<void> {
    this.db.settings = normalizeSettings(bundle.settings);
    this.db.categories = bundle.categories?.length
      ? bundle.categories
      : DEFAULT_CATEGORIES.map((c) => ({ ...c }));
    this.db.series = bundle.series ?? [];
    this.db.tasks = Object.fromEntries((bundle.tasks ?? []).map((t) => [t.id, t]));
    this.db.tracking = Object.fromEntries(
      (bundle.tracking ?? []).map((t) => [t.date, t]),
    );
    this.commit({ settings: true, categories: true, series: true, tasks: true, tracking: true });
  }
}
