"use client";

import { useRef, useState, type ReactNode } from "react";
import { Download, Monitor, Moon, Repeat, Sun, Upload, X } from "lucide-react";
import type {
  Category,
  ExportBundle,
  Series,
  Settings,
  ThemePreference,
  TrackingKey,
} from "@/lib/data/types";
import { recurrenceLabel } from "@/lib/data/series";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { categoryColor } from "@/components/task/TaskRow";

const THEMES: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Açık", icon: Sun },
  { value: "dark", label: "Koyu", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

const TRACKING_LABELS: Array<{ key: TrackingKey; label: string }> = [
  { key: "water", label: "Su" },
  { key: "movement", label: "Hareket" },
  { key: "sleep", label: "Uyku" },
  { key: "reading", label: "Okuma" },
  { key: "focus", label: "Odak süresi" },
  { key: "mood", label: "Ruh hali" },
  { key: "note", label: "Günün notu" },
];

const GOAL_FIELDS: Array<{
  key: keyof Settings["goals"];
  label: string;
  unit: string;
  step: number;
  max: number;
}> = [
  { key: "water", label: "Su", unit: "bardak", step: 1, max: 20 },
  { key: "movement", label: "Hareket", unit: "dk", step: 5, max: 300 },
  { key: "sleep", label: "Uyku", unit: "saat", step: 1, max: 14 },
  { key: "reading", label: "Okuma", unit: "dk", step: 5, max: 300 },
  { key: "focus", label: "Odak", unit: "dk", step: 15, max: 720 },
];

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-base">{children}</h3>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-sm text-muted">{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange(next: boolean): void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-moss" : "bg-rule-strong",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-raised shadow-sm transition-all duration-200",
          checked ? "left-[1.125rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

function NumberField({
  value,
  onChange,
  step,
  min = 0,
  max,
  unit,
  label,
}: {
  value: number;
  onChange(next: number): void;
  step: number;
  min?: number;
  max: number;
  unit: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) {
            onChange(Math.min(max, Math.max(min, next)));
          }
        }}
        className="numerals w-16 rounded-md border border-rule bg-raised px-2 py-1 text-right text-sm outline-none transition-colors focus:border-quince"
      />
      <span className="w-12 text-xs text-muted">{unit}</span>
    </span>
  );
}

interface SettingsSheetProps {
  open: boolean;
  onClose(): void;
  settings: Settings;
  categories: Category[];
  seriesList: Series[];
  localMode: boolean;
  onSave(patch: Partial<Settings>): void;
  onRenameCategory(id: string, name: string): void;
  onDeleteSeries(id: string): void;
  onExport(): Promise<ExportBundle>;
  onImport(bundle: ExportBundle): Promise<void>;
  onNotify(message: string): void;
}

export function SettingsSheet({
  open,
  onClose,
  settings,
  categories,
  seriesList,
  localMode,
  onSave,
  onRenameCategory,
  onDeleteSeries,
  onExport,
  onImport,
  onNotify,
}: SettingsSheetProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null);

  const exportJson = async () => {
    setBusy(true);
    try {
      const bundle = await onExport();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pusula-${bundle.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify("Yedek indirildi.");
    } catch {
      onNotify("Yedek alınamadı.");
    } finally {
      setBusy(false);
    }
  };

  const readFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportBundle;
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tasks)) {
        onNotify("Bu dosya bir Pusula yedeği değil.");
        return;
      }
      setPendingImport(parsed);
    } catch {
      onNotify("Dosya okunamadı.");
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    setBusy(true);
    try {
      await onImport(pendingImport);
      onNotify("Yedek geri yüklendi.");
      setPendingImport(null);
    } catch {
      onNotify("Geri yükleme tamamlanamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Ayarlar" width="md">
      <div className="flex flex-col gap-8">
        {/* ── görünüm ── */}
        <section>
          <SectionTitle>Görünüm</SectionTitle>
          <div className="mt-3 flex rounded-md border border-rule p-0.5">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => onSave({ theme: value })}
                aria-pressed={settings.theme === value}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[5px] px-3 py-1.5 text-sm transition-colors",
                  settings.theme === value
                    ? "bg-ink text-paper"
                    : "text-muted hover:text-ink",
                )}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ── plan kuralları ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Plan</SectionTitle>
          <div className="mt-2">
            <Row label="Erteleme hakkı">
              <NumberField
                label="Erteleme hakkı"
                value={settings.postponeLimit}
                onChange={(postponeLimit) => onSave({ postponeLimit })}
                step={1}
                max={5}
                unit="kez"
              />
            </Row>
            <p className="-mt-0.5 mb-2 text-xs leading-relaxed text-faint">
              Bir görevi düğmeyle en fazla kaç kez ileri atabilirsin.
              Sürükleyip taşımak hak harcamaz.
            </p>
            <Row label="Hafta başlangıcı">
              <div className="flex rounded-md border border-rule p-0.5">
                {([1, 0] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onSave({ weekStartsOn: value })}
                    aria-pressed={settings.weekStartsOn === value}
                    className={cn(
                      "rounded-[5px] px-3 py-1 text-xs transition-colors",
                      settings.weekStartsOn === value
                        ? "bg-ink text-paper"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {value === 1 ? "Pazartesi" : "Pazar"}
                  </button>
                ))}
              </div>
            </Row>
          </div>
        </section>

        {/* ── günlük hedefler ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Günlük hedefler</SectionTitle>
          <div className="mt-2">
            {GOAL_FIELDS.map(({ key, label, unit, step, max }) => (
              <Row key={key} label={label}>
                <NumberField
                  label={`${label} hedefi`}
                  value={settings.goals[key]}
                  onChange={(next) =>
                    onSave({ goals: { ...settings.goals, [key]: next } })
                  }
                  step={step}
                  max={max}
                  unit={unit}
                />
              </Row>
            ))}
          </div>
        </section>

        {/* ── takip alanları ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Günlük takipte görünenler</SectionTitle>
          <div className="mt-2">
            {TRACKING_LABELS.map(({ key, label }) => (
              <Row key={key} label={label}>
                <Toggle
                  label={label}
                  checked={settings.tracking[key]}
                  onChange={(next) =>
                    onSave({ tracking: { ...settings.tracking, [key]: next } })
                  }
                />
              </Row>
            ))}
          </div>
        </section>

        {/* ── kategoriler ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Kategoriler</SectionTitle>
          <div className="mt-3 flex flex-col gap-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: categoryColor(category) }}
                />
                <input
                  defaultValue={category.name}
                  aria-label={`${category.name} adı`}
                  onBlur={(e) => {
                    const next = e.target.value.trim();
                    if (next && next !== category.name) {
                      onRenameCategory(category.id, next);
                    } else {
                      e.target.value = category.name;
                    }
                  }}
                  className="flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm outline-none transition-colors hover:border-rule focus:border-quince focus:bg-raised"
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── tekrarlayan görevler ── */}
        {seriesList.length > 0 && (
          <section className="border-t border-rule pt-6">
            <SectionTitle>Tekrarlayan görevler</SectionTitle>
            <div className="mt-3 flex flex-col gap-2">
              {seriesList.map((series) => (
                <div
                  key={series.id}
                  className="flex items-center gap-3 rounded-md border border-rule bg-raised px-3 py-2"
                >
                  <Repeat size={13} strokeWidth={1.75} className="shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{series.title}</p>
                    <p className="text-xs text-muted">
                      {recurrenceLabel(series.recurrence)}
                      {series.startTime ? ` — ${series.startTime}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteSeries(series.id)}
                    aria-label={`${series.title} tekrarını kaldır`}
                    title="Tekrarı kaldır"
                    className="rounded p-1 text-muted transition-colors hover:bg-sunk hover:text-brick"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── yedekleme ── */}
        <section className="border-t border-rule pt-6">
          <SectionTitle>Yedekleme</SectionTitle>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Tüm görevler, takip verileri ve ayarlar tek bir JSON dosyasına yazılır.
            {localMode &&
              " Yerel modda veri yalnızca bu tarayıcıda durduğu için yedek almak özellikle önemli."}
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={exportJson}>
              <Download size={14} strokeWidth={1.75} />
              Dışa aktar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={14} strokeWidth={1.75} />
              İçe aktar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void readFile(file);
              }}
            />
          </div>

          {pendingImport && (
            <div className="mt-3 rounded-md border border-brick/35 bg-brick/8 px-3 py-3">
              <p className="text-sm">
                Bu yedek {pendingImport.tasks.length} görev içeriyor.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Geri yüklemek şu andaki tüm görev, takip ve ayar verini silip
                yedektekiyle değiştirir. Bu işlem geri alınamaz.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={confirmImport}
                >
                  Veriyi değiştir
                </Button>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setPendingImport(null)}
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}
