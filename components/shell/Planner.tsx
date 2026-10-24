"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth/AuthProvider";
import { authErrorMessage } from "@/lib/firebase/client";
import { usePlanner } from "@/lib/store/PlannerProvider";
import type { ISODate, Task } from "@/lib/data/types";
import { greeting, isToday, todayISO } from "@/lib/date";
import { useToast } from "@/components/ui/Toast";
import { Header } from "./Header";
import { WeekView } from "@/components/week/WeekView";
import {
  TaskEditor,
  editorKey,
  type EditorTarget,
} from "@/components/task/TaskEditor";
import { emptyTracking } from "@/lib/data/defaults";
import { DaySheet } from "@/components/tracking/DaySheet";
import { WeekSummarySheet } from "@/components/summary/WeekSummarySheet";
import { SettingsSheet } from "@/components/settings/SettingsSheet";

function LoadingPage() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-sm text-faint"
      >
        Haftan hazırlanıyor…
      </motion.p>
    </div>
  );
}

export function Planner() {
  const { user, signOut, linkApple, mode } = useAuth();
  const planner = usePlanner();
  const { toast } = useToast();

  /* Paneller "hedef + açık mı" ikilisiyle tutuluyor: kapanırken hedef yerinde
     kaldığı için kayarak çıkma animasyonu boş bir panelle oynamıyor.
     `seq` her açılışta artıyor; böylece aynı görev ikinci kez açıldığında
     panel baştan kuruluyor ve vazgeçilen yazılar formda kalmıyor. */
  const [editor, setEditor] = useState<{
    target: EditorTarget;
    open: boolean;
    seq: number;
  } | null>(null);
  const [daySheet, setDaySheet] = useState<{
    date: ISODate;
    open: boolean;
    seq: number;
  } | null>(null);

  const openEditor = useCallback((target: EditorTarget) => {
    setEditor((prev) => ({ target, open: true, seq: (prev?.seq ?? 0) + 1 }));
  }, []);

  const openDaySheet = useCallback((date: ISODate) => {
    setDaySheet((prev) => ({ date, open: true, seq: (prev?.seq ?? 0) + 1 }));
  }, []);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastCategoryId, setLastCategoryId] = useState<string | null>(null);

  const {
    ready,
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
    setTracking,
    saveSettings,
    editCategory,
    exportData,
    importData,
  } = planner;

  /* ── klavye kısayolları ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goWeek(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goWeek(1);
      } else if (e.key === "t" || e.key === "T") {
        goToToday();
      } else if (e.key === "n" || e.key === "N") {
        // Bugün görünür haftadaysa oraya, değilse seçili güne yeni görev.
        const target = dates.find(isToday) ?? selectedDay;
        e.preventDefault();
        document
          .querySelector<HTMLButtonElement>(`[data-quickadd="${target}"]`)
          ?.click();
      } else if (e.key === "?") {
        setSummaryOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goWeek, goToToday, dates, selectedDay]);

  /* ── eylemler ── */
  const handlePostpone = useCallback(
    async (task: Task) => {
      const result = await postpone(task);
      if (result === "limit") {
        toast("Bu görevi daha fazla erteleyemezsin. Yapma zamanı 💪");
      }
    },
    [postpone, toast],
  );

  const handleDelete = useCallback(
    async (task: Task) => {
      await removeTask(task);
      toast("Görev silindi.", {
        label: "Geri al",
        run: () => restoreTask(task),
      });
    },
    [removeTask, restoreTask, toast],
  );

  const handleQuickAdd = useCallback(
    (
      date: ISODate,
      input: { title: string; startTime: string | null; categoryId: string | null },
    ) => {
      void addTask({
        title: input.title,
        date,
        startTime: input.startTime,
        categoryId: input.categoryId,
      });
    },
    [addTask],
  );

  const handleLinkApple = useCallback(async () => {
    try {
      await linkApple();
      toast("Apple hesabı bağlandı. Artık iki yöntemle de aynı plana girebilirsin.");
    } catch (e) {
      const code =
        e && typeof e === "object" && "code" in e
          ? (e as { code: unknown }).code
          : undefined;
      toast(authErrorMessage(code));
    }
  }, [linkApple, toast]);

  if (!ready || !user) return <LoadingPage />;

  return (
    <div className="flex h-full flex-col px-2 pt-3 pb-2 sm:px-3 sm:pt-4 sm:pb-3">
      <Header
        name={user.firstName}
        fullName={user.displayName}
        photoURL={user.photoURL}
        greeting={greeting()}
        dates={dates}
        weekOffset={weekOffsetFromNow}
        percent={summary.percent}
        done={summary.done}
        total={summary.total}
        email={user.email}
        localMode={mode === "local"}
        canLinkApple={mode === "firebase" && !user.providerIds.includes("apple.com")}
        onPrev={() => goWeek(-1)}
        onNext={() => goWeek(1)}
        onToday={goToToday}
        onOpenSummary={() => setSummaryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onLinkApple={() => void handleLinkApple()}
        onSignOut={() => void signOut()}
      />

      <WeekView
        dates={dates}
        tasksByDate={tasksByDate}
        trackingByDate={trackingByDate}
        settings={settings}
        categories={categories}
        categoryById={categoryById}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        lastCategoryId={lastCategoryId}
        onPickCategory={setLastCategoryId}
        onAdd={handleQuickAdd}
        onToggle={(task) => void toggleDone(task)}
        onPostpone={(task) => void handlePostpone(task)}
        onEdit={(task) => openEditor({ kind: "edit", task })}
        onDelete={(task) => void handleDelete(task)}
        onTracking={(date, patch) => void setTracking(date, patch)}
        onOpenDay={openDaySheet}
        onMove={(task, date) => void moveTask(task, date)}
      />

      <footer className="flex shrink-0 items-center justify-between gap-3 px-2 pt-2 text-2xs text-faint">
        <span className="hidden gap-4 sm:flex">
          <span>← → hafta</span>
          <span>T bugün</span>
          <span>N yeni görev</span>
        </span>
        <button
          type="button"
          onClick={() =>
            openEditor({
              kind: "new",
              date: dates.find(isToday) ?? selectedDay ?? todayISO(),
            })
          }
          className="ml-auto rounded px-2 py-1 transition-colors hover:bg-surface hover:text-muted"
        >
          Ayrıntılı görev ekle
        </button>
      </footer>

      {editor && (
        <TaskEditor
          key={`${editorKey(editor.target)}#${editor.seq}`}
          target={editor.target}
          open={editor.open}
          categories={categories}
          seriesList={seriesList}
          onClose={() => setEditor((e) => (e ? { ...e, open: false } : null))}
          onSaveTask={editTask}
          onCreateTask={(input) => addTask(input)}
          onCreateSeries={addSeries}
          onDeleteTask={handleDelete}
          onDeleteSeries={removeSeries}
        />
      )}

      {daySheet && (
        <DaySheet
          key={`${daySheet.date}#${daySheet.seq}`}
          date={daySheet.date}
          tracking={trackingByDate[daySheet.date] ?? emptyTracking(daySheet.date)}
          open={daySheet.open}
          settings={settings}
          onClose={() => setDaySheet((d) => (d ? { ...d, open: false } : null))}
          onChange={(date, patch) => void setTracking(date, patch)}
        />
      )}

      <WeekSummarySheet
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        dates={dates}
        summary={summary}
        trackingByDate={trackingByDate}
        tasksByDate={tasksByDate}
        settings={settings}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        categories={categories}
        seriesList={seriesList}
        localMode={mode === "local"}
        onSave={(patch) => void saveSettings(patch)}
        onRenameCategory={(id, name) => void editCategory(id, { name })}
        onDeleteSeries={(id) => void removeSeries(id)}
        onExport={exportData}
        onImport={importData}
        onNotify={toast}
      />
    </div>
  );
}
