import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type CollectionReference,
  type Firestore,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { newId } from "@/lib/utils";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SETTINGS,
  normalizeSettings,
} from "./defaults";
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

/** Firestore `undefined` kabul etmiyor; yama nesnesinden temizliyoruz. */
function clean<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const BATCH_LIMIT = 450;

async function commitInChunks(
  db: Firestore,
  ops: Array<(batch: ReturnType<typeof writeBatch>) => void>,
) {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) op(batch);
    await batch.commit();
  }
}

/**
 * Tüm veri `users/{uid}` altında; güvenlik kuralları da bunu zorunlu kılıyor
 * (bkz. firestore.rules). Haftalık dinleyiciler sadece görünen 7 güne bağlanır,
 * böylece ücretsiz kota boşa harcanmaz.
 */
export class FirestoreRepo implements PlannerRepo {
  readonly mode = "firebase" as const;

  private db: Firestore;

  constructor(private uid: string) {
    this.db = getFirebaseDb();
  }

  private userDoc() {
    return doc(this.db, "users", this.uid);
  }

  private col(name: string): CollectionReference {
    return collection(this.db, "users", this.uid, name);
  }

  private settingsDoc() {
    return doc(this.db, "users", this.uid, "settings", "main");
  }

  async bootstrap(profile: Omit<Profile, "createdAt">): Promise<void> {
    const snap = await getDoc(this.userDoc());

    // İlk giriş: profil, varsayılan ayarlar ve varsayılan kategoriler tek
    // yazma turunda oluşur. Sonraki girişlerde hiçbirine dokunulmaz.
    if (!snap.exists()) {
      const batch = writeBatch(this.db);
      batch.set(this.userDoc(), {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
        createdAt: Date.now(),
      });
      batch.set(this.settingsDoc(), DEFAULT_SETTINGS);
      for (const category of DEFAULT_CATEGORIES) {
        batch.set(doc(this.col("categories"), category.id), category);
      }
      await batch.commit();
      return;
    }

    // Google'daki ad veya fotoğraf sonradan değişmiş olabilir; profili güncel tut.
    const existing = snap.data() as Partial<Profile>;
    if (
      existing.displayName !== profile.displayName ||
      existing.email !== profile.email ||
      existing.photoURL !== profile.photoURL
    ) {
      await updateDoc(this.userDoc(), {
        displayName: profile.displayName,
        email: profile.email,
        photoURL: profile.photoURL,
      });
    }
  }

  subscribeSettings(cb: (s: Settings) => void): Unsubscribe {
    return onSnapshot(
      this.settingsDoc(),
      (snap) => cb(normalizeSettings(snap.data())),
      () => cb({ ...DEFAULT_SETTINGS }),
    );
  }

  subscribeCategories(cb: (c: Category[]) => void): Unsubscribe {
    return onSnapshot(this.col("categories"), (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Category), id: d.id }));
      list.sort((a, b) => a.order - b.order);
      cb(list);
    });
  }

  subscribeSeries(cb: (s: Series[]) => void): Unsubscribe {
    return onSnapshot(this.col("series"), (snap) => {
      cb(
        snap.docs.map((d) => {
          const data = d.data() as Series;
          return { ...data, id: d.id, skips: data.skips ?? [] };
        }),
      );
    });
  }

  subscribeTasks(dates: ISODate[], cb: (t: Task[]) => void): Unsubscribe {
    const q = query(this.col("tasks"), where("date", "in", dates));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as Task), id: d.id })));
    });
  }

  subscribeTracking(
    dates: ISODate[],
    cb: (t: DailyTracking[]) => void,
  ): Unsubscribe {
    const q = query(this.col("dailyTracking"), where(documentId(), "in", dates));
    return onSnapshot(q, (snap) => {
      cb(snap.docs.map((d) => ({ ...(d.data() as DailyTracking), date: d.id })));
    });
  }

  async createTask(input: NewTask): Promise<void> {
    const id = newId("t");
    const task: Task = {
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
    await setDoc(doc(this.col("tasks"), id), task);
  }

  async createSeriesTasks(tasks: Task[]): Promise<void> {
    if (!tasks.length) return;
    await commitInChunks(
      this.db,
      tasks.map((t) => (batch: ReturnType<typeof writeBatch>) => {
        // merge yok: var olan kaydın üzerine yazmayalım, yalnızca eksikse oluşsun.
        batch.set(doc(this.col("tasks"), t.id), t);
      }),
    );
  }

  async updateTask(id: string, patch: Partial<Task>): Promise<void> {
    await updateDoc(doc(this.col("tasks"), id), clean(patch));
  }

  async deleteTask(id: string): Promise<void> {
    await deleteDoc(doc(this.col("tasks"), id));
  }

  async upsertTracking(
    date: ISODate,
    patch: Partial<DailyTracking>,
  ): Promise<void> {
    /* Yalnızca değişen alanlar yazılır. Buraya emptyTracking'i yaymak
       ölümcül: merge açık olsa bile o nesne bütün alanları sıfır değerleriyle
       taşıdığı için her yazma diğer takipleri siliyordu (hareketi değiştir,
       su sıfırlansın). Eksik alanların varsayılanı zaten okurken
       uygulanıyor — bkz. PlannerProvider'daki trackingByDate. */
    await setDoc(
      doc(this.col("dailyTracking"), date),
      { ...clean(patch), date },
      { merge: true },
    );
  }

  async updateSettings(patch: Partial<Settings>): Promise<void> {
    await setDoc(this.settingsDoc(), clean(patch), { merge: true });
  }

  async createCategory(input: Omit<Category, "id">): Promise<void> {
    const id = newId("c");
    await setDoc(doc(this.col("categories"), id), { ...input, id });
  }

  async updateCategory(id: string, patch: Partial<Category>): Promise<void> {
    await updateDoc(doc(this.col("categories"), id), clean(patch));
  }

  async deleteCategory(id: string): Promise<void> {
    const affected = await getDocs(
      query(this.col("tasks"), where("categoryId", "==", id)),
    );
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = affected.docs.map(
      (d) => (b) => b.update(d.ref, { categoryId: null }),
    );
    ops.push((b) => b.delete(doc(this.col("categories"), id)));
    await commitInChunks(this.db, ops);
  }

  async createSeries(
    input: Omit<Series, "id" | "createdAt" | "skips">,
  ): Promise<string> {
    const id = newId("s");
    await setDoc(doc(this.col("series"), id), {
      ...input,
      id,
      skips: [],
      createdAt: Date.now(),
    });
    return id;
  }

  async updateSeries(id: string, patch: Partial<Series>): Promise<void> {
    await updateDoc(doc(this.col("series"), id), clean(patch));
  }

  async deleteSeries(id: string): Promise<void> {
    const tasks = await getDocs(
      query(this.col("tasks"), where("seriesId", "==", id)),
    );
    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = tasks.docs.map(
      (d) => (b) => b.delete(d.ref),
    );
    ops.push((b) => b.delete(doc(this.col("series"), id)));
    await commitInChunks(this.db, ops);
  }

  async exportAll(): Promise<ExportBundle> {
    const [profileSnap, settingsSnap, cats, series, tasks, tracking] =
      await Promise.all([
        getDoc(this.userDoc()),
        getDoc(this.settingsDoc()),
        getDocs(this.col("categories")),
        getDocs(this.col("series")),
        getDocs(this.col("tasks")),
        getDocs(this.col("dailyTracking")),
      ]);

    const profile = profileSnap.data() as Profile | undefined;

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      profile: profile
        ? { displayName: profile.displayName, email: profile.email }
        : null,
      settings: normalizeSettings(settingsSnap.data()),
      categories: cats.docs.map((d) => ({ ...(d.data() as Category), id: d.id })),
      series: series.docs.map((d) => {
        const data = d.data() as Series;
        return { ...data, id: d.id, skips: data.skips ?? [] };
      }),
      tasks: tasks.docs.map((d) => ({ ...(d.data() as Task), id: d.id })),
      tracking: tracking.docs.map((d) => ({
        ...(d.data() as DailyTracking),
        date: d.id,
      })),
    };
  }

  /** İçe aktarma mevcut veriyi değiştirir — çağıran taraf onay almalı. */
  async importAll(bundle: ExportBundle): Promise<void> {
    const [cats, series, tasks, tracking] = await Promise.all([
      getDocs(this.col("categories")),
      getDocs(this.col("series")),
      getDocs(this.col("tasks")),
      getDocs(this.col("dailyTracking")),
    ]);

    const ops: Array<(b: ReturnType<typeof writeBatch>) => void> = [];
    for (const snap of [cats, series, tasks, tracking]) {
      for (const d of snap.docs) ops.push((b) => b.delete(d.ref));
    }

    ops.push((b) => b.set(this.settingsDoc(), normalizeSettings(bundle.settings)));
    for (const c of bundle.categories ?? DEFAULT_CATEGORIES) {
      ops.push((b) => b.set(doc(this.col("categories"), c.id), c));
    }
    for (const s of bundle.series ?? []) {
      ops.push((b) => b.set(doc(this.col("series"), s.id), s));
    }
    for (const t of bundle.tasks ?? []) {
      ops.push((b) => b.set(doc(this.col("tasks"), t.id), t));
    }
    for (const t of bundle.tracking ?? []) {
      ops.push((b) => b.set(doc(this.col("dailyTracking"), t.date), t));
    }

    await commitInChunks(this.db, ops);
  }
}
