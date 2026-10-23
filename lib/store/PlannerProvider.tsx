"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { DEFAULT_SETTINGS, emptyTracking } from "@/lib/data/defaults";
import { FirestoreRepo } from "@/lib/data/firestore";
import { LocalRepo } from "@/lib/data/local";
import { materializeSeries, seriesTaskId, timeToOrder } from "@/lib/data/series";
import type {
  Category,
  DailyTracking,
  ExportBundle,
  ISODate,
  NewTask,
  PlannerRepo,
  Recurrence,
  Series,
  Settings,
  Task,
} from "@/lib/data/types";
import {
  addDaysISO,
  shiftWeek,
  todayISO,
  weekDates as computeWeekDates,
} from "@/lib/date";

export interface WeekSummary {
  done: number;
  todo: number;
  postponed: number;
  total: number;
  percent: number;
  bestDay: ISODate | null;
  waterAvg: number;
  movementAvg: number;
  /** Bu hafta içinde, bugüne kadar üst üste hedefi tutan gün sayısı. */
  streak: number;
}

export type PostponeResult = "ok" | "limit" | "noop";

interface PlannerContextValue {
  ready: boolean;
  mode: "firebase" | "local";
  settings: Settings;
  categories: Category[];
  seriesList: Series[];

  /** Görünen haftanın 7 günü (Pzt→Paz ya da ayara göre). */
  dates: ISODate[];
  weekOffsetFromNow: number;
  selectedDay: ISODate;
  setSelectedDay(date: ISODate): void;
  goWeek(delta: number): void;
  goToToday(): void;

  tasksByDate: Record<ISODate, Task[]>;
  trackingByDate: Record<ISODate, DailyTracking>;
  summary: WeekSummary;
  categoryById: Record<string, Category>;

  addTask(input: NewTask): Promise<void>;
  editTask(id: string, patch: Partial<Task>): Promise<void>;
  removeTask(task: Task): Promise<void>;
  toggleDone(task: Task): Promise<void>;
  postpone(task: Task, toDate?: ISODate): Promise<PostponeResult>;
  /** Sürükle-bırak taşıma: erteleme hakkı harcamaz. */
  moveTask(task: Task, toDate: ISODate, order?: number): Promise<void>;
  restoreTask(task: Task): Promise<void>;

  addSeries(input: {
    title: string;
    note?: string;
    categoryId: string | null;
    startTime: string | null;
    durationMin: number | null;
    priority?: "normal" | "high";
    recurrence: Recurrence;
    startDate: ISODate;
  }): Promise<void>;
  removeSeries(id: string): Promise<void>;

  setTracking(date: ISODate, patch: Partial<DailyTracking>): Promise<void>;
  saveSettings(patch: Partial<Settings>): Promise<void>;

  addCategory(input: Omit<Category, "id">): Promise<void>;
  editCategory(id: string, patch: Partial<Category>): Promise<void>;
  removeCategory(id: string): Promise<void>;

  exportData(): Promise<ExportBundle>;
  importData(bundle: ExportBundle): Promise<void>;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

function sortTasks(a: Task, b: Task): number {
  // Bitenler aşağıya iner — bakış hep yapılacak işe düşsün.
  if (a.status !== b.status) return a.status === "done" ? 1 : -1;
  if (a.order !== b.order) return a.order - b.order;
  return a.createdAt - b.createdAt;
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { user, mode } = useAuth();

  const repo = useMemo<PlannerRepo | null>(() => {
    if (!user) return null;
    return mode === "firebase" ? new FirestoreRepo(user.uid) : new LocalRepo();
  }, [user, mode]);

  /* Hangi repo için kurulum bittiğini tutuyoruz. Bayrağı effect başında
     sıfırlamak yerine repoyu karşılaştırmak, kullanıcı değişince eski
     aboneliklerin bir an açık kalmasını da engelliyor. */
  const [bootstrappedRepo, setBootstrappedRepo] = useState<PlannerRepo | null>(
    null,
  );
  const bootstrapped = bootstrappedRepo !== null && bootstrappedRepo === repo;
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tracking, setTracking] = useState<DailyTracking[]>([]);

  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [selectedDay, setSelectedDay] = useState<ISODate>(() => todayISO());

  const dates = useMemo(
    () => computeWeekDates(anchor, settings.weekStartsOn),
    [anchor, settings.weekStartsOn],
  );

  /* ── kurulum ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!repo || !user) return;
    let alive = true;
    repo
      .bootstrap({
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      })
      .catch(() => {
        /* kurallar veya ağ engellerse abonelikler yine denenir */
      })
      .finally(() => {
        if (alive) setBootstrappedRepo(repo);
      });
    return () => {
      alive = false;
    };
  }, [repo, user]);

  /* ── abonelikler ───────────────────────────────────────────── */
  useEffect(() => {
    if (!repo || !bootstrapped) return;
    const unsubs = [
      repo.subscribeSettings((s) => {
        setSettings(s);
        setSettingsLoaded(true);
      }),
      repo.subscribeCategories(setCategories),
      repo.subscribeSeries(setSeriesList),
    ];
    return () => unsubs.forEach((u) => u());
  }, [repo, bootstrapped]);

  // Haftalık dinleyiciler yalnızca görünen 7 güne bağlanır.
  useEffect(() => {
    if (!repo || !bootstrapped) return;
    const unsubs = [
      repo.subscribeTasks(dates, setTasks),
      repo.subscribeTracking(dates, setTracking),
    ];
    return () => unsubs.forEach((u) => u());
  }, [repo, bootstrapped, dates]);

  /* ── tema ──────────────────────────────────────────────────── */
  useEffect(() => {
    const apply = () => {
      const dark =
        settings.theme === "dark" ||
        (settings.theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    try {
      window.localStorage.setItem("hp-theme", settings.theme);
    } catch {
      /* gizli sekmede yazamayabilir, önemli değil */
    }
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

  /* ── tekrarlayan görevleri görünen haftaya yaz ─────────────── */
  const requestedSeriesIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!repo || !bootstrapped || !seriesList.length) return;
    // Geçmiş haftaları yeniden yazmıyoruz: o gün o görev yoktu.
    if (dates[6] < todayISO()) return;

    const existing = new Set(tasks.map((t) => t.id));
    const missing = materializeSeries(seriesList, dates, existing).filter(
      (t) => !requestedSeriesIds.current.has(t.id),
    );
    if (!missing.length) return;

    for (const t of missing) requestedSeriesIds.current.add(t.id);
    repo.createSeriesTasks(missing).catch(() => {
      for (const t of missing) requestedSeriesIds.current.delete(t.id);
    });
  }, [repo, bootstrapped, seriesList, dates, tasks]);

  /* ── türetilmiş veriler ────────────────────────────────────── */
  const tasksByDate = useMemo(() => {
    const map: Record<ISODate, Task[]> = {};
    for (const date of dates) map[date] = [];
    for (const task of tasks) {
      if (map[task.date]) map[task.date].push(task);
    }
    for (const date of dates) map[date].sort(sortTasks);
    return map;
  }, [tasks, dates]);

  const trackingByDate = useMemo(() => {
    const map: Record<ISODate, DailyTracking> = {};
    for (const date of dates) map[date] = emptyTracking(date);
    for (const entry of tracking) {
      if (map[entry.date]) map[entry.date] = { ...map[entry.date], ...entry };
    }
    return map;
  }, [tracking, dates]);

  const categoryById = useMemo(() => {
    const map: Record<string, Category> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const summary = useMemo<WeekSummary>(() => {
    const done = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    const postponed = tasks.filter((t) => t.postponeCount > 0).length;

    let bestDay: ISODate | null = null;
    let bestDone = 0;
    for (const date of dates) {
      const d = tasksByDate[date].filter((t) => t.status === "done").length;
      if (d > bestDone) {
        bestDone = d;
        bestDay = date;
      }
    }

    const today = todayISO();
    const elapsed = dates.filter((d) => d <= today);
    const waterAvg = elapsed.length
      ? Math.round(
          (elapsed.reduce((n, d) => n + trackingByDate[d].waterGlasses, 0) /
            elapsed.length) *
            10,
        ) / 10
      : 0;
    const movementAvg = elapsed.length
      ? Math.round(
          elapsed.reduce((n, d) => n + trackingByDate[d].movementMin, 0) /
            elapsed.length,
        )
      : 0;

    // Bugünden geriye doğru, görevlerinin en az %70'ini bitirdiğin günler.
    let streak = 0;
    for (let i = elapsed.length - 1; i >= 0; i--) {
      const dayTasks = tasksByDate[elapsed[i]];
      if (!dayTasks.length) break;
      const ratio =
        dayTasks.filter((t) => t.status === "done").length / dayTasks.length;
      if (ratio < 0.7) break;
      streak++;
    }

    return {
      done,
      todo: total - done,
      postponed,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
      bestDay,
      waterAvg,
      movementAvg,
      streak,
    };
  }, [tasks, dates, tasksByDate, trackingByDate]);

  const weekOffsetFromNow = useMemo(() => {
    const current = computeWeekDates(new Date(), settings.weekStartsOn)[0];
    const shown = dates[0];
    return Math.round(
      (new Date(shown).getTime() - new Date(current).getTime()) /
        (7 * 24 * 60 * 60 * 1000),
    );
  }, [dates, settings.weekStartsOn]);

  /* ── eylemler ──────────────────────────────────────────────── */
  const goWeek = useCallback((delta: number) => {
    setAnchor((prev) => shiftWeek(prev, delta));
  }, []);

  const goToToday = useCallback(() => {
    setAnchor(new Date());
    setSelectedDay(todayISO());
  }, []);

  const addTask = useCallback(
    async (input: NewTask) => {
      await repo?.createTask(input);
    },
    [repo],
  );

  const editTask = useCallback(
    async (id: string, patch: Partial<Task>) => {
      await repo?.updateTask(id, patch);
    },
    [repo],
  );

  /**
   * Seriden üretilmiş bir görev kendi gününden ayrıldığında (silinme, taşınma,
   * erteleme) o gün serinin atlama listesine giriyor; yoksa hafta yeniden
   * açıldığında aynı görev yerinde tekrar oluşurdu.
   */
  const skipSeriesDay = useCallback(
    async (task: Task) => {
      if (!repo || !task.seriesId) return;
      const series = seriesList.find((s) => s.id === task.seriesId);
      if (!series) return;
      const generatedDate = task.id.startsWith(`${series.id}__`)
        ? task.id.slice(series.id.length + 2)
        : task.originalDate;
      if (series.skips.includes(generatedDate)) return;
      await repo.updateSeries(series.id, {
        skips: [...series.skips, generatedDate],
      });
    },
    [repo, seriesList],
  );

  const removeTask = useCallback(
    async (task: Task) => {
      if (!repo) return;
      if (task.seriesId) await skipSeriesDay(task);
      await repo.deleteTask(task.id);
    },
    [repo, skipSeriesDay],
  );

  const restoreTask = useCallback(
    async (task: Task) => {
      if (!repo) return;
      await repo.createSeriesTasks([task]);
      if (task.seriesId) {
        const series = seriesList.find((s) => s.id === task.seriesId);
        const generatedDate = task.id.startsWith(`${task.seriesId}__`)
          ? task.id.slice(task.seriesId.length + 2)
          : task.originalDate;
        if (series?.skips.includes(generatedDate)) {
          await repo.updateSeries(series.id, {
            skips: series.skips.filter((d) => d !== generatedDate),
          });
        }
      }
    },
    [repo, seriesList],
  );

  const toggleDone = useCallback(
    async (task: Task) => {
      if (!repo) return;
      const next = task.status === "done" ? "todo" : "done";
      await repo.updateTask(task.id, {
        status: next,
        completedAt: next === "done" ? Date.now() : null,
      });
    },
    [repo],
  );

  const postpone = useCallback(
    async (task: Task, toDate?: ISODate): Promise<PostponeResult> => {
      if (!repo) return "noop";
      if (task.postponeCount >= settings.postponeLimit) return "limit";
      const target = toDate ?? addDaysISO(task.date, 1);
      if (target === task.date) return "noop";
      if (task.seriesId) await skipSeriesDay(task);
      await repo.updateTask(task.id, {
        date: target,
        postponeCount: task.postponeCount + 1,
        status: "todo",
        completedAt: null,
      });
      return "ok";
    },
    [repo, settings.postponeLimit, skipSeriesDay],
  );

  const moveTask = useCallback(
    async (task: Task, toDate: ISODate, order?: number) => {
      if (!repo || toDate === task.date) return;
      if (task.seriesId) await skipSeriesDay(task);
      await repo.updateTask(task.id, {
        date: toDate,
        ...(order !== undefined ? { order } : {}),
      });
    },
    [repo, skipSeriesDay],
  );

  const addSeries = useCallback<PlannerContextValue["addSeries"]>(
    async (input) => {
      if (!repo) return;
      await repo.createSeries({
        title: input.title,
        note: input.note ?? "",
        categoryId: input.categoryId,
        startTime: input.startTime,
        durationMin: input.durationMin,
        priority: input.priority ?? "normal",
        recurrence: input.recurrence,
        startDate: input.startDate,
        active: true,
      });
    },
    [repo],
  );

  const removeSeries = useCallback(
    async (id: string) => {
      await repo?.deleteSeries(id);
    },
    [repo],
  );

  const setTrackingValue = useCallback(
    async (date: ISODate, patch: Partial<DailyTracking>) => {
      await repo?.upsertTracking(date, patch);
    },
    [repo],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      await repo?.updateSettings(patch);
    },
    [repo],
  );

  const addCategory = useCallback(
    async (input: Omit<Category, "id">) => {
      await repo?.createCategory(input);
    },
    [repo],
  );

  const editCategory = useCallback(
    async (id: string, patch: Partial<Category>) => {
      await repo?.updateCategory(id, patch);
    },
    [repo],
  );

  const removeCategory = useCallback(
    async (id: string) => {
      await repo?.deleteCategory(id);
    },
    [repo],
  );

  const exportData = useCallback(async () => {
    if (!repo) throw new Error("Veri katmanı hazır değil.");
    return repo.exportAll();
  }, [repo]);

  const importData = useCallback(
    async (bundle: ExportBundle) => {
      if (!repo) return;
      requestedSeriesIds.current.clear();
      await repo.importAll(bundle);
    },
    [repo],
  );

  const value = useMemo<PlannerContextValue>(
    () => ({
      ready: bootstrapped && settingsLoaded,
      mode,
      settings,
      categories,
      seriesList,
      dates,
      weekOffsetFromNow,
      selectedDay,
      setSelectedDay,
      goWeek,
      goToToday,
      tasksByDate,
      trackingByDate,
      summary,
      categoryById,
      addTask,
      editTask,
      removeTask,
      toggleDone,
      postpone,
      moveTask,
      restoreTask,
      addSeries,
      removeSeries,
      setTracking: setTrackingValue,
      saveSettings,
      addCategory,
      editCategory,
      removeCategory,
      exportData,
      importData,
    }),
    [
      bootstrapped,
      settingsLoaded,
      mode,
      settings,
      categories,
      seriesList,
      dates,
      weekOffsetFromNow,
      selectedDay,
      goWeek,
      goToToday,
      tasksByDate,
      trackingByDate,
      summary,
      categoryById,
      addTask,
      editTask,
      removeTask,
      toggleDone,
      postpone,
      moveTask,
      restoreTask,
      addSeries,
      removeSeries,
      setTrackingValue,
      saveSettings,
      addCategory,
      editCategory,
      removeCategory,
      exportData,
      importData,
    ],
  );

  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner, PlannerProvider içinde kullanılmalı.");
  return ctx;
}

export { timeToOrder, seriesTaskId };
