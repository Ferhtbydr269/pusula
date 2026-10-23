/** "YYYY-MM-DD" — bütün gün anahtarları bu biçimde, yerel saate göre. */
export type ISODate = string;

export type CategoryColor =
  | "petrol"
  | "plum"
  | "ochre"
  | "moss"
  | "clay"
  | "slate";

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
  order: number;
}

/** ISO gün numaraları: 1 = Pazartesi … 7 = Pazar */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Recurrence =
  | { kind: "daily" }
  | { kind: "weekdays" }
  | { kind: "days"; days: Weekday[] };

export type TaskStatus = "todo" | "done";

export interface Task {
  id: string;
  title: string;
  note: string;
  categoryId: string | null;
  date: ISODate;
  /** "HH:mm" ya da null */
  startTime: string | null;
  durationMin: number | null;
  priority: "normal" | "high";
  status: TaskStatus;
  /**
   * Yalnızca "Ertele" düğmesiyle ileri taşımalar sayılır.
   * Sürükle-bırak ile taşımak hak harcamaz — bkz. moveTask / postponeTask.
   */
  postponeCount: number;
  /** Görevin ilk kurulduğu gün; erteleme izini göstermek için tutulur. */
  originalDate: ISODate;
  /** Tekrarlayan bir seriden üretildiyse serinin kimliği. */
  seriesId: string | null;
  completedAt: number | null;
  createdAt: number;
  /** Gün içi sıralama; küçük olan üstte. */
  order: number;
}

export type NewTask = Pick<Task, "title" | "date"> &
  Partial<
    Pick<
      Task,
      | "note"
      | "categoryId"
      | "startTime"
      | "durationMin"
      | "priority"
      | "order"
    >
  >;

/**
 * Tekrarlayan görevler tek tek kaydedilmiyor: seri olarak saklanıp
 * görüntülenen haftada somut göreve dönüştürülüyor (bkz. materializeSeries).
 * Böylece ileriye dönük yüzlerce doküman yazılmıyor.
 */
export interface Series {
  id: string;
  title: string;
  note: string;
  categoryId: string | null;
  startTime: string | null;
  durationMin: number | null;
  priority: "normal" | "high";
  recurrence: Recurrence;
  /** Serinin başladığı gün — öncesine görev üretilmez. */
  startDate: ISODate;
  /** Kullanıcı tek bir günü sildiyse o gün bir daha üretilmez. */
  skips: ISODate[];
  active: boolean;
  createdAt: number;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface DailyTracking {
  date: ISODate;
  waterGlasses: number;
  movementMin: number;
  sleepHours: number;
  readingMin: number;
  focusMin: number;
  mood: Mood | null;
  note: string;
}

export type TrackingKey =
  | "water"
  | "movement"
  | "sleep"
  | "reading"
  | "focus"
  | "mood"
  | "note";

export type ThemePreference = "light" | "dark" | "system";

export interface Settings {
  theme: ThemePreference;
  /** Bir görevin kaç kez ertelenebileceği. */
  postponeLimit: number;
  /** 1 = Pazartesi, 0 = Pazar */
  weekStartsOn: 0 | 1;
  goals: {
    water: number;
    movement: number;
    sleep: number;
    reading: number;
    focus: number;
  };
  tracking: Record<TrackingKey, boolean>;
}

export interface Profile {
  uid: string;
  displayName: string;
  email: string;
  /** Google hesabının profil fotoğrafı. */
  photoURL: string | null;
  createdAt: number;
}

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  profile: Pick<Profile, "displayName" | "email"> | null;
  settings: Settings;
  categories: Category[];
  series: Series[];
  tasks: Task[];
  tracking: DailyTracking[];
}

export type Unsubscribe = () => void;

/**
 * Arayüzün gördüğü tek veri yüzeyi. Firestore ve yerel (tarayıcı belleği)
 * uygulamaları bunu karşılar; bileşenler hiçbir zaman Firebase'i doğrudan
 * çağırmaz.
 */
export interface PlannerRepo {
  readonly mode: "firebase" | "local";

  /** Yeni kullanıcıya varsayılan kategoriler + ayarlar kurar (varsa dokunmaz). */
  bootstrap(profile: Omit<Profile, "createdAt">): Promise<void>;

  subscribeSettings(cb: (settings: Settings) => void): Unsubscribe;
  subscribeCategories(cb: (categories: Category[]) => void): Unsubscribe;
  subscribeSeries(cb: (series: Series[]) => void): Unsubscribe;
  /** Yalnızca görünen haftanın 7 gününü dinler. */
  subscribeTasks(dates: ISODate[], cb: (tasks: Task[]) => void): Unsubscribe;
  subscribeTracking(
    dates: ISODate[],
    cb: (tracking: DailyTracking[]) => void,
  ): Unsubscribe;

  createTask(input: NewTask): Promise<void>;
  /** Seriden üretilen görevler sabit kimlikle yazılır: idempotent. */
  createSeriesTasks(tasks: Task[]): Promise<void>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;

  upsertTracking(date: ISODate, patch: Partial<DailyTracking>): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;

  createCategory(input: Omit<Category, "id">): Promise<void>;
  updateCategory(id: string, patch: Partial<Category>): Promise<void>;
  deleteCategory(id: string): Promise<void>;

  createSeries(input: Omit<Series, "id" | "createdAt" | "skips">): Promise<string>;
  updateSeries(id: string, patch: Partial<Series>): Promise<void>;
  deleteSeries(id: string): Promise<void>;

  exportAll(): Promise<ExportBundle>;
  importAll(bundle: ExportBundle): Promise<void>;
}
