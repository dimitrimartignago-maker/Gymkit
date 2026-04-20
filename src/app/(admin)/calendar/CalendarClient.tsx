"use client";

import { AdminSlotAttendees } from "@/components/booking/AdminSlotAttendees";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Database } from "@/lib/supabase/types";
import { ChevronLeft, ChevronRight, Edit2, Users, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { cancelSlot, createSlots, updateSlot } from "./actions";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

export interface SlotWithDetails {
  id: string;
  course_id: string;
  recurrence_id: string | null;
  trainer_ids: string[];
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  course_name: string;
  course_color: string;
  trainer_names: string[];
}

type TrainerProfile = { id: string; first_name: string; last_name: string };
type SeriesScope = "single" | "series";

const IT_DAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]; // index 0=Mon

const DAYS_OF_WEEK = [
  { dow: 1, label: "L" },
  { dow: 2, label: "M" },
  { dow: 3, label: "M" },
  { dow: 4, label: "G" },
  { dow: 5, label: "V" },
  { dow: 6, label: "S" },
  { dow: 7, label: "D" },
];

const HOUR_START = 6;
const HOUR_END = 23;
const HOUR_HEIGHT = 64;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => i + HOUR_START);

function extractTime(iso: string): string { return iso.substring(11, 16); }
function extractDate(iso: string): string { return iso.substring(0, 10); }

function getMinutes(iso: string): number {
  return parseInt(iso.substring(11, 13), 10) * 60 + parseInt(iso.substring(14, 16), 10);
}

function localDateStr(d: Date): string {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function formatDay(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function offsetWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return localDateStr(d);
}

function offsetDay(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function weekStartOf(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateStr(d);
}

function todayStr(): string { return localDateStr(new Date()); }

interface Props {
  weekStart: string;
  view: "week" | "day";
  viewDate: string;
  slots: SlotWithDetails[];
  courses: CourseRow[];
  trainers: TrainerProfile[];
}

type ModalState =
  | { type: "newSlot" }
  | { type: "slotDetail"; slot: SlotWithDetails }
  | null;

export function CalendarClient({ weekStart, view, viewDate, slots, courses, trainers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [error, setError] = useState("");

  // ── New Slot form ──────────────────────────────────────────────────────────
  const [slotForm, setSlotForm] = useState({
    course_id: courses[0]?.id ?? "",
    date: "",
    start_time: "09:00",
    end_time: "10:00",
    trainer_ids: [] as string[],
    repeat: false,
    repeat_days: [] as number[],
    repeat_until: "",
  });

  // ── Edit form ──────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [editScope, setEditScope] = useState<SeriesScope>("single");
  const [editForm, setEditForm] = useState({
    start_time: "09:00",
    end_time: "10:00",
    trainer_ids: [] as string[],
  });

  // ── Cancel state ───────────────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState("");
  const [cancelScope, setCancelScope] = useState<SeriesScope>("single");

  function patchSlot(p: Partial<typeof slotForm>) { setSlotForm((f) => ({ ...f, ...p })); }
  function patchEdit(p: Partial<typeof editForm>) { setEditForm((f) => ({ ...f, ...p })); }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }

  // Dates to display (7 for week, 1 for day)
  const displayDates = useMemo(() => {
    if (view === "day") return [new Date(viewDate + "T00:00:00")];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart + "T00:00:00");
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [view, viewDate, weekStart]);

  // Slots grouped by display date
  const slotsByDate = useMemo(() =>
    displayDates.map((date) => {
      const ds = localDateStr(date);
      return slots.filter((s) => extractDate(s.starts_at) === ds);
    }), [displayDates, slots]);

  // Preview count for repeat creation
  const slotPreviewCount = useMemo(() => {
    if (!slotForm.repeat || !slotForm.date || !slotForm.repeat_until || slotForm.repeat_days.length === 0) return 0;
    let count = 0;
    const end = new Date(slotForm.repeat_until + "T00:00:00");
    const cur = new Date(slotForm.date + "T00:00:00");
    while (cur <= end) {
      const dow = cur.getDay() === 0 ? 7 : cur.getDay();
      if (slotForm.repeat_days.includes(dow)) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }, [slotForm.repeat, slotForm.date, slotForm.repeat_until, slotForm.repeat_days]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  function navigatePrev() {
    if (view === "week") router.push(`/calendar?view=week&week=${offsetWeek(weekStart, -1)}`);
    else { const d = offsetDay(viewDate, -1); router.push(`/calendar?view=day&date=${d}&week=${weekStartOf(d)}`); }
  }
  function navigateNext() {
    if (view === "week") router.push(`/calendar?view=week&week=${offsetWeek(weekStart, 1)}`);
    else { const d = offsetDay(viewDate, 1); router.push(`/calendar?view=day&date=${d}&week=${weekStartOf(d)}`); }
  }
  function navigateToday() {
    const today = todayStr();
    if (view === "week") router.push(`/calendar?view=week&week=${weekStartOf(today)}`);
    else router.push(`/calendar?view=day&date=${today}&week=${weekStartOf(today)}`);
  }
  function switchView(v: "week" | "day") {
    if (v === "week") router.push(`/calendar?view=week&week=${weekStart}`);
    else router.push(`/calendar?view=day&date=${viewDate}&week=${weekStart}`);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openNewSlot(prefilledDate?: string) {
    const date = prefilledDate ?? (view === "day" ? viewDate : "");
    const dowOfDate = date
      ? (() => { const js = new Date(date + "T00:00:00").getDay(); return [js === 0 ? 7 : js]; })()
      : [];
    patchSlot({ date, start_time: "09:00", end_time: "10:00", trainer_ids: [], repeat: false, repeat_days: dowOfDate, repeat_until: "" });
    setError("");
    setModal({ type: "newSlot" });
  }

  function handleCreateSlots() {
    if (!slotForm.course_id || !slotForm.date) { setError("Corso e data sono obbligatori."); return; }
    if (slotForm.repeat && (!slotForm.repeat_until || slotForm.repeat_days.length === 0)) {
      setError("Seleziona i giorni e la data di fine ripetizione."); return;
    }
    setError("");
    startTransition(async () => {
      const result = await createSlots({
        course_id: slotForm.course_id,
        start_date: slotForm.date,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        trainer_ids: slotForm.trainer_ids,
        repeat: slotForm.repeat
          ? { days_of_week: slotForm.repeat_days, until: slotForm.repeat_until }
          : false,
      });
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      showToast(slotForm.repeat
        ? `${result.created} slot creati${result.skipped ? `, ${result.skipped} già esistenti` : ""}.`
        : "Slot creato.");
      router.refresh();
    });
  }

  function openEditMode(slot: SlotWithDetails) {
    setEditForm({ start_time: extractTime(slot.starts_at), end_time: extractTime(slot.ends_at), trainer_ids: slot.trainer_ids });
    setEditScope("single");
    setEditMode(true);
    setError("");
  }

  function handleUpdateSlot() {
    const slot = modal?.type === "slotDetail" ? modal.slot : null;
    if (!slot) return;
    setError("");
    startTransition(async () => {
      const result = await updateSlot(slot.id, editForm, editScope);
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      setEditMode(false);
      showToast(editScope === "series" ? "Serie modificata." : "Slot modificato.");
      router.refresh();
    });
  }

  function handleCancelSlot() {
    const slot = modal?.type === "slotDetail" ? modal.slot : null;
    if (!slot) return;
    setError("");
    startTransition(async () => {
      const result = await cancelSlot(slot.id, cancelReason, cancelScope);
      if (!result.success) { setError(result.error ?? "Errore."); return; }
      setModal(null);
      setCancelReason("");
      showToast(cancelScope === "series" ? "Serie cancellata." : "Slot cancellato.");
      router.refresh();
    });
  }

  function toggleRepeatDay(dow: number) {
    patchSlot({ repeat_days: slotForm.repeat_days.includes(dow) ? slotForm.repeat_days.filter((d) => d !== dow) : [...slotForm.repeat_days, dow] });
  }

  const availableTrainers = trainers.filter((t) => !slotForm.trainer_ids.includes(t.id));
  const availableEditTrainers = trainers.filter((t) => !editForm.trainer_ids.includes(t.id));

  const inputClass = "h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 flex-wrap">

          {/* Prev / label / Next / Oggi */}
          <div className="flex items-center gap-1.5 mr-auto">
            <button onClick={navigatePrev} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold text-[var(--color-text)] min-w-[150px] text-center">
              {view === "week" ? formatWeekRange(weekStart) : formatDay(viewDate)}
            </span>
            <button onClick={navigateNext} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
              <ChevronRight size={18} />
            </button>
            <button onClick={navigateToday} className="px-3 py-1.5 rounded-lg bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors ml-1">
              Oggi
            </button>
          </div>

          {/* View toggle */}
          <div className="flex bg-[var(--color-surface-raised)] rounded-lg p-0.5 border border-[var(--color-border)]">
            {(["week", "day"] as const).map((v) => (
              <button key={v} onClick={() => switchView(v)}
                className={["px-4 py-1.5 rounded-md text-xs font-medium transition-colors",
                  view === v ? "bg-[var(--color-accent)] text-white" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
                ].join(" ")}
              >
                {v === "week" ? "Settimana" : "Giorno"}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={() => openNewSlot()}>+ Nuovo Slot</Button>
        </div>
        {error && <p className="px-4 pb-3 text-sm text-[var(--color-error)]">{error}</p>}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">

        {/* Day headers */}
        <div className="sticky top-0 z-10 flex bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <div className="w-12 flex-shrink-0" />
          {displayDates.map((date) => {
            const ds = localDateStr(date);
            const isToday = ds === todayStr();
            const dayLabel = view === "week"
              ? IT_DAY_LABELS[date.getDay() === 0 ? 6 : date.getDay() - 1]
              : date.toLocaleDateString("it-IT", { weekday: "long" });
            return (
              <div key={ds} onClick={() => openNewSlot(ds)}
                className="flex-1 min-w-[100px] py-2 text-center cursor-pointer hover:bg-[var(--color-surface-raised)] transition-colors"
              >
                <div className="text-xs text-[var(--color-text-secondary)]">{dayLabel}</div>
                <div className={["text-sm font-semibold", isToday ? "text-[var(--color-accent)]" : "text-[var(--color-text)]"].join(" ")}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex">
          {/* Hour labels */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 text-[10px] text-[var(--color-text-secondary)] select-none"
                style={{ top: (h - HOUR_START) * HOUR_HEIGHT - 7 }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {displayDates.map((date, dayIdx) => (
            <div key={localDateStr(date)}
              className="flex-1 min-w-[100px] relative border-l border-[var(--color-border)]"
              style={{ height: TOTAL_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div key={h} className="absolute w-full border-t border-[var(--color-border)]"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT }} />
              ))}
              {HOURS.map((h) => (
                <div key={`${h}h`} className="absolute w-full border-t border-[var(--color-border)] opacity-30"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
              ))}

              {slotsByDate[dayIdx].filter((s) => !s.is_cancelled).map((slot) => {
                const startMins = getMinutes(slot.starts_at);
                const endMins = getMinutes(slot.ends_at);
                const rawTop = ((startMins - HOUR_START * 60) / 60) * HOUR_HEIGHT;
                const rawHeight = Math.max(((endMins - startMins) / 60) * HOUR_HEIGHT, 24);
                const top = Math.max(rawTop, 0);
                const height = Math.min(rawHeight - (top - rawTop), TOTAL_HEIGHT - top - 2);
                if (height <= 0) return null;

                return (
                  <button key={slot.id}
                    onClick={() => { setCancelReason(""); setEditMode(false); setError(""); setCancelScope("single"); setEditScope("single"); setModal({ type: "slotDetail", slot }); }}
                    className="absolute left-0.5 right-0.5 rounded text-left transition-opacity hover:opacity-80 overflow-hidden"
                    style={{ top: top + 1, height: height - 2, backgroundColor: `${slot.course_color}28`, borderLeft: `3px solid ${slot.course_color}`, zIndex: 2 }}
                  >
                    <div className="px-1 pt-0.5">
                      <div className="text-[10px] font-semibold truncate" style={{ color: slot.course_color }}>
                        {extractTime(slot.starts_at)} {slot.course_name}
                      </div>
                      {height >= 40 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          <Users size={9} className="text-[var(--color-text-secondary)]" />
                          <span className="text-[9px] text-[var(--color-text-secondary)]">{slot.confirmed_count}/{slot.capacity}</span>
                          {slot.waitlist_count > 0 && <span className="text-[9px] text-[var(--color-text-secondary)]">+{slot.waitlist_count}L</span>}
                        </div>
                      )}
                      {height >= 56 && slot.trainer_names.length > 0 && (
                        <div className="text-[9px] text-[var(--color-text-secondary)] truncate mt-0.5">{slot.trainer_names.join(", ")}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-[calc(var(--bottom-bar-height)+16px)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* MODAL: Nuovo Slot */}
      <Modal open={modal?.type === "newSlot"} onClose={() => setModal(null)} title="Nuovo Slot">
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide opacity-60">Corso *</label>
            <select value={slotForm.course_id} onChange={(e) => patchSlot({ course_id: e.target.value })} className={inputClass}>
              <option value="">— Seleziona corso —</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Data inizio *</label>
              <input type="date" value={slotForm.date}
                onChange={(e) => {
                  const date = e.target.value;
                  const js = new Date(date + "T00:00:00").getDay();
                  const dow = js === 0 ? 7 : js;
                  patchSlot({ date, repeat_days: slotForm.repeat_days.length === 0 ? [dow] : slotForm.repeat_days });
                }}
                className={inputClass}
              />
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Dalle</label>
              <input type="time" value={slotForm.start_time} onChange={(e) => patchSlot({ start_time: e.target.value })} className={inputClass} />
            </div>
            <div className="w-24 flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide opacity-60">Alle</label>
              <input type="time" value={slotForm.end_time} onChange={(e) => patchSlot({ end_time: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* Trainer multi-select */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide opacity-60">Trainer</label>
            {slotForm.trainer_ids.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {slotForm.trainer_ids.map((tid) => {
                  const t = trainers.find((x) => x.id === tid);
                  return (
                    <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs border border-[var(--color-border)]">
                      {t ? `${t.first_name} ${t.last_name}` : tid}
                      <button type="button" onClick={() => patchSlot({ trainer_ids: slotForm.trainer_ids.filter((x) => x !== tid) })} className="opacity-50 hover:opacity-100">×</button>
                    </span>
                  );
                })}
              </div>
            )}
            {availableTrainers.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) patchSlot({ trainer_ids: [...slotForm.trainer_ids, e.target.value] }); e.target.value = ""; }} className={inputClass}>
                <option value="">+ Aggiungi trainer…</option>
                {availableTrainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            )}
          </div>

          {/* Ripeti toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-surface-raised)] border border-[var(--color-border)] cursor-pointer"
            onClick={() => patchSlot({ repeat: !slotForm.repeat })}>
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">Ripeti</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                {slotForm.repeat ? "Genera più slot automaticamente" : "Crea lo slot una sola volta"}
              </div>
            </div>
            <div className={["w-10 h-5 rounded-full transition-colors relative flex-shrink-0", slotForm.repeat ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"].join(" ")}>
              <div className={["w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow", slotForm.repeat ? "right-0.5" : "left-0.5"].join(" ")} />
            </div>
          </div>

          {slotForm.repeat && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide opacity-60">Giorni *</label>
                <div className="flex gap-1.5">
                  {DAYS_OF_WEEK.map(({ dow, label }) => (
                    <button key={dow} type="button" onClick={() => toggleRepeatDay(dow)}
                      className={["w-9 h-9 rounded-full text-xs font-semibold transition-colors",
                        slotForm.repeat_days.includes(dow) ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs uppercase tracking-wide opacity-60">Ripeti fino al *</label>
                <input type="date" value={slotForm.repeat_until} min={slotForm.date}
                  onChange={(e) => patchSlot({ repeat_until: e.target.value })} className={inputClass} />
              </div>
              {slotPreviewCount > 0 && (
                <div className="p-3 rounded-lg text-sm bg-[rgba(233,69,96,0.1)] border border-[rgba(233,69,96,0.3)]">
                  <span className="font-bold text-[var(--color-accent)]">{slotPreviewCount} slot</span> verranno creati
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleCreateSlots}>
            {slotForm.repeat && slotPreviewCount > 0 ? `Crea ${slotPreviewCount} Slot` : "Crea Slot"}
          </Button>
        </div>
      </Modal>

      {/* MODAL: Dettaglio Slot */}
      <Modal open={modal?.type === "slotDetail"} onClose={() => { setModal(null); setEditMode(false); }}
        title={modal?.type === "slotDetail" ? modal.slot.course_name : "Slot"}>
        {modal?.type === "slotDetail" && (
          <div className="flex flex-col gap-5 pt-2">
            {!editMode ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {new Date(extractDate(modal.slot.starts_at) + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                      {" · "}{extractTime(modal.slot.starts_at)} – {extractTime(modal.slot.ends_at)}
                    </p>
                    {modal.slot.trainer_names.length > 0 && (
                      <p className="text-sm text-[var(--color-text-secondary)]">Trainer: {modal.slot.trainer_names.join(", ")}</p>
                    )}
                    {modal.slot.recurrence_id && (
                      <p className="text-xs text-[var(--color-text-secondary)] opacity-60">Slot ricorrente</p>
                    )}
                    {modal.slot.is_cancelled && (
                      <div className="mt-1 flex items-center gap-2 text-[var(--color-error)] text-sm">
                        <XCircle size={16} />
                        <span>Cancellato{modal.slot.cancellation_reason ? `: ${modal.slot.cancellation_reason}` : ""}</span>
                      </div>
                    )}
                  </div>
                  {!modal.slot.is_cancelled && (
                    <button onClick={() => openEditMode(modal.slot)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors">
                      <Edit2 size={12} />Modifica
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  {[{ value: modal.slot.confirmed_count, label: "Confermati" }, { value: modal.slot.waitlist_count, label: "In attesa" }, { value: Math.max(0, modal.slot.capacity - modal.slot.confirmed_count), label: "Liberi" }].map(({ value, label }) => (
                    <div key={label} className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] flex flex-col gap-0.5">
                      <span className="text-xl font-bold text-[var(--color-text)]">{value}</span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border)]">
                  <p className="text-sm font-medium text-[var(--color-text)]">Partecipanti</p>
                  <AdminSlotAttendees slotId={modal.slot.id} />
                </div>

                {!modal.slot.is_cancelled && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
                    <p className="text-sm font-medium text-[var(--color-text)]">Cancella slot</p>
                    {modal.slot.recurrence_id && (
                      <div className="flex gap-2">
                        {(["single", "series"] as SeriesScope[]).map((s) => (
                          <button key={s} type="button" onClick={() => setCancelScope(s)}
                            className={["flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                              cancelScope === s ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
                            ].join(" ")}
                          >{s === "single" ? "Solo questo slot" : "Tutta la serie"}</button>
                        ))}
                      </div>
                    )}
                    <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Motivazione (opzionale)"
                      className={inputClass + " placeholder:text-[var(--color-text-secondary)]"} />
                    {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
                    <Button variant="danger" fullWidth loading={isPending} onClick={handleCancelSlot}>
                      {cancelScope === "series" ? "Cancella Tutta la Serie" : "Cancella Slot"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {modal.slot.recurrence_id && (
                    <div className="flex gap-2">
                      {(["single", "series"] as SeriesScope[]).map((s) => (
                        <button key={s} type="button" onClick={() => setEditScope(s)}
                          className={["flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                            editScope === s ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]" : "bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)]",
                          ].join(" ")}
                        >{s === "single" ? "Solo questo slot" : "Tutta la serie"}</button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text)]">Inizio</label>
                      <input type="time" value={editForm.start_time} onChange={(e) => patchEdit({ start_time: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-[var(--color-text)]">Fine</label>
                      <input type="time" value={editForm.end_time} onChange={(e) => patchEdit({ end_time: e.target.value })} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[var(--color-text)]">Trainer</label>
                    {editForm.trainer_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {editForm.trainer_ids.map((tid) => {
                          const t = trainers.find((x) => x.id === tid);
                          return (
                            <span key={tid} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs border border-[var(--color-border)]">
                              {t ? `${t.first_name} ${t.last_name}` : tid}
                              <button type="button" onClick={() => patchEdit({ trainer_ids: editForm.trainer_ids.filter((x) => x !== tid) })} className="opacity-50 hover:opacity-100">×</button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {availableEditTrainers.length > 0 && (
                      <select value="" onChange={(e) => { if (e.target.value) patchEdit({ trainer_ids: [...editForm.trainer_ids, e.target.value] }); e.target.value = ""; }} className={inputClass}>
                        <option value="">+ Aggiungi trainer…</option>
                        {availableEditTrainers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </select>
                    )}
                  </div>
                </div>
                {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
                <div className="flex gap-2">
                  <Button variant="secondary" fullWidth onClick={() => { setEditMode(false); setError(""); }}>Annulla</Button>
                  <Button fullWidth loading={isPending} onClick={handleUpdateSlot}>
                    {editScope === "series" ? "Salva Serie" : "Salva"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
