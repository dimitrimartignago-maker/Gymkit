"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Database } from "@/lib/supabase/types";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelSlot,
  createSchedule,
  createSlot,
  generateSlotsForWeek,
} from "./actions";

type CourseRow   = Database["public"]["Tables"]["courses"]["Row"];
type ScheduleRow = Database["public"]["Tables"]["course_schedules"]["Row"];

export interface SlotWithDetails {
  id: string;
  course_id: string;
  trainer_id: string | null;
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  capacity: number;
  confirmed_count: number;
  waitlist_count: number;
  course_name: string;
  course_color: string;
  trainer_name: string | null;
}

type TrainerProfile = { id: string; first_name: string; last_name: string };

const IT_DAYS_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const IT_DAYS_LONG  = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatWeekRange(weekStart: string) {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function offsetWeek(weekStart: string, delta: number): string {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + delta * 7);
  return d.toISOString().split("T")[0];
}

function toLocalDate(iso: string): string {
  // Return YYYY-MM-DD in local time
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

interface ModalState {
  type: "newSlot" | "newSchedule" | "slotDetail";
  slot?: SlotWithDetails;
  prefilledDate?: string;
}

interface Props {
  weekStart: string;
  slots: SlotWithDetails[];
  courses: CourseRow[];
  schedules: ScheduleRow[];
  trainers: TrainerProfile[];
  trainerId: string;
}

export function ScheduleClient({
  weekStart,
  slots,
  courses,
  schedules,
  trainers,
  trainerId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [error, setError] = useState("");

  // Slot creation form
  const [slotForm, setSlotForm] = useState({
    course_id: courses[0]?.id ?? "",
    date: "",
    start_time: "09:00",
    end_time: "10:00",
    trainer_id: trainerId,
  });

  // Schedule creation form
  const [schedForm, setSchedForm] = useState({
    course_id: courses[0]?.id ?? "",
    day_of_week: 1,
    start_time: "09:00",
    end_time: "10:00",
    trainer_id: trainerId,
  });

  // Cancel slot form
  const [cancelReason, setCancelReason] = useState("");

  function patchSlot(p: Partial<typeof slotForm>) {
    setSlotForm((f) => ({ ...f, ...p }));
  }
  function patchSched(p: Partial<typeof schedForm>) {
    setSchedForm((f) => ({ ...f, ...p }));
  }

  function openSlotForDate(date: Date) {
    const dateStr = date.toISOString().split("T")[0];
    patchSlot({ date: dateStr });
    setError("");
    setModal({ type: "newSlot", prefilledDate: dateStr });
  }

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  }

  // Week grid
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return d;
  });

  const slotsByDay = weekDates.map((date) => {
    const dateStr = date.toISOString().split("T")[0];
    return slots.filter((s) => toLocalDate(s.starts_at) === dateStr);
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleGenerate() {
    setError("");
    startTransition(async () => {
      const result = await generateSlotsForWeek(weekStart);
      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        showToast(
          result.count === 0
            ? "Nessuno slot nuovo da generare."
            : `${result.count} slot generati.`
        );
        router.refresh();
      }
    });
  }

  function handleCreateSlot() {
    if (!slotForm.course_id || !slotForm.date) {
      setError("Corso e data sono obbligatori.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createSlot({
        course_id: slotForm.course_id,
        starts_at: `${slotForm.date}T${slotForm.start_time}:00`,
        ends_at: `${slotForm.date}T${slotForm.end_time}:00`,
        trainer_id: slotForm.trainer_id || null,
      });
      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        setModal(null);
        showToast("Slot creato.");
        router.refresh();
      }
    });
  }

  function handleCreateSchedule() {
    if (!schedForm.course_id) {
      setError("Seleziona un corso.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await createSchedule({
        course_id: schedForm.course_id,
        day_of_week: schedForm.day_of_week,
        start_time: schedForm.start_time + ":00",
        end_time: schedForm.end_time + ":00",
        trainer_id: schedForm.trainer_id || null,
      });
      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        setModal(null);
        showToast("Ricorrenza creata. Genera gli slot per applicarla.");
        router.refresh();
      }
    });
  }

  function handleCancelSlot() {
    if (!modal?.slot) return;
    setError("");
    startTransition(async () => {
      const result = await cancelSlot(modal.slot!.id, cancelReason);
      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        setModal(null);
        setCancelReason("");
        showToast("Slot cancellato.");
        router.refresh();
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3 px-4 md:px-6 py-4 flex-wrap">
          <h1 className="text-lg font-semibold text-[var(--color-text)] mr-auto">
            Calendario
          </h1>

          {/* Week navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/schedule?week=${offsetWeek(weekStart, -1)}`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-[var(--color-text-secondary)] min-w-[130px] text-center">
              {formatWeekRange(weekStart)}
            </span>
            <button
              onClick={() => router.push(`/schedule?week=${offsetWeek(weekStart, 1)}`)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={isPending}
              onClick={handleGenerate}
            >
              <RefreshCw size={14} />
              Genera Slot
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setError(""); setModal({ type: "newSchedule" }); }}
            >
              <Calendar size={14} />
              Ricorrenza
            </Button>
            <Button
              size="sm"
              onClick={() => { setError(""); patchSlot({ date: weekStart }); setModal({ type: "newSlot" }); }}
            >
              <CalendarPlus size={14} />
              Slot
            </Button>
          </div>
        </div>

        {error && (
          <p className="px-4 pb-3 text-sm text-[var(--color-error)]">{error}</p>
        )}
      </div>

      {/* Weekly grid */}
      <div className="overflow-x-auto flex-1 px-4 py-4">
        <div className="flex gap-3 min-w-max">
          {weekDates.map((date, dayIdx) => {
            const daySlots = slotsByDay[dayIdx];
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div key={date.toISOString()} className="w-44 flex flex-col gap-2">
                {/* Day header */}
                <div
                  className="flex items-center justify-between pb-1 border-b border-[var(--color-border)] cursor-pointer group"
                  onClick={() => openSlotForDate(date)}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                      {IT_DAYS_SHORT[date.getDay()]}
                    </span>
                    <span
                      className={[
                        "text-sm font-semibold",
                        isToday
                          ? "text-[var(--color-accent)]"
                          : "text-[var(--color-text)]",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity">
                    + slot
                  </span>
                </div>

                {/* Slot cards */}
                <div className="flex flex-col gap-2">
                  {daySlots.length === 0 && (
                    <button
                      onClick={() => openSlotForDate(date)}
                      className="h-10 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)] transition-colors"
                    >
                      <span className="text-xs">+ slot</span>
                    </button>
                  )}

                  {daySlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setCancelReason("");
                        setError("");
                        setModal({ type: "slotDetail", slot });
                      }}
                      className={[
                        "text-left rounded-[var(--radius-sm)] p-2 border-l-4 transition-opacity hover:opacity-80 w-full",
                        slot.is_cancelled
                          ? "opacity-40 bg-[var(--color-surface-raised)]"
                          : "bg-[var(--color-surface-raised)]",
                      ].join(" ")}
                      style={{ borderLeftColor: slot.is_cancelled ? "#6b7280" : slot.course_color }}
                    >
                      <div className="text-xs font-semibold text-[var(--color-text)]">
                        {formatTime(slot.starts_at)}
                      </div>
                      <div
                        className="text-[11px] font-medium truncate"
                        style={{ color: slot.is_cancelled ? "var(--color-text-secondary)" : slot.course_color }}
                      >
                        {slot.course_name}
                        {slot.is_cancelled && " (cancellato)"}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users size={10} className="text-[var(--color-text-secondary)]" />
                        <span className="text-[10px] text-[var(--color-text-secondary)]">
                          {slot.confirmed_count}/{slot.capacity}
                        </span>
                        {slot.waitlist_count > 0 && (
                          <span className="text-[10px] text-[var(--color-text-secondary)]">
                            +{slot.waitlist_count}L
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recurring schedules legend */}
      {schedules.length > 0 && (
        <div className="px-4 py-3 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-secondary)] mb-2 font-medium uppercase tracking-wide">
            Ricorrenze attive
          </p>
          <div className="flex flex-wrap gap-2">
            {schedules.map((s) => {
              const course = courses.find((c) => c.id === s.course_id);
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)]"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: course?.color ?? "#3b82f6" }}
                  />
                  {IT_DAYS_LONG[s.day_of_week] ?? `Giorno ${s.day_of_week}`}{" "}
                  {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-[calc(var(--bottom-bar-height)+16px)] left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-sm text-[var(--color-text)] shadow-lg whitespace-nowrap">
          {toastMsg}
        </div>
      )}

      {/* ── MODAL: New Slot ──────────────────────────────────────────────── */}
      <Modal
        open={modal?.type === "newSlot"}
        onClose={() => setModal(null)}
        title="Nuovo Slot"
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Corso *
            </label>
            <select
              value={slotForm.course_id}
              onChange={(e) => patchSlot({ course_id: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Seleziona corso —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Data *
            </label>
            <input
              type="date"
              value={slotForm.date}
              onChange={(e) => patchSlot({ date: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Inizio
              </label>
              <input
                type="time"
                value={slotForm.start_time}
                onChange={(e) => patchSlot({ start_time: e.target.value })}
                className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Fine
              </label>
              <input
                type="time"
                value={slotForm.end_time}
                onChange={(e) => patchSlot({ end_time: e.target.value })}
                className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Trainer (override)
            </label>
            <select
              value={slotForm.trainer_id}
              onChange={(e) => patchSlot({ trainer_id: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Nessuno —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleCreateSlot}>
            Crea Slot
          </Button>
        </div>
      </Modal>

      {/* ── MODAL: New Schedule (recurring) ────────────────────────────── */}
      <Modal
        open={modal?.type === "newSchedule"}
        onClose={() => setModal(null)}
        title="Nuova Ricorrenza"
      >
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Corso *
            </label>
            <select
              value={schedForm.course_id}
              onChange={(e) => patchSched({ course_id: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Seleziona corso —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Giorno della settimana
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {IT_DAYS_LONG.slice(1).map((day, i) => {
                const dow = i + 1; // 1=Mon, 7=Sun
                const isSelected = schedForm.day_of_week === dow;
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => patchSched({ day_of_week: dow })}
                    className={[
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                      isSelected
                        ? "bg-[var(--color-accent)] text-white"
                        : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
                    ].join(" ")}
                  >
                    {IT_DAYS_SHORT[dow === 7 ? 0 : dow]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Inizio
              </label>
              <input
                type="time"
                value={schedForm.start_time}
                onChange={(e) => patchSched({ start_time: e.target.value })}
                className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Fine
              </label>
              <input
                type="time"
                value={schedForm.end_time}
                onChange={(e) => patchSched({ end_time: e.target.value })}
                className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Trainer
            </label>
            <select
              value={schedForm.trainer_id}
              onChange={(e) => patchSched({ trainer_id: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Nessuno —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleCreateSchedule}>
            Crea Ricorrenza
          </Button>
        </div>
      </Modal>

      {/* ── MODAL: Slot Detail (bookings + cancel) ──────────────────────── */}
      <Modal
        open={modal?.type === "slotDetail"}
        onClose={() => setModal(null)}
        title={modal?.slot?.course_name ?? "Slot"}
      >
        {modal?.slot && (
          <div className="flex flex-col gap-5 pt-2">
            {/* Slot info */}
            <div className="flex flex-col gap-1">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {new Date(modal.slot.starts_at).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {formatTime(modal.slot.starts_at)} – {formatTime(modal.slot.ends_at)}
              </p>
              {modal.slot.trainer_name && (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Trainer: {modal.slot.trainer_name}
                </p>
              )}
              {modal.slot.is_cancelled && (
                <div className="mt-1 flex items-center gap-2 text-[var(--color-error)] text-sm">
                  <XCircle size={16} />
                  <span>
                    Cancellato{modal.slot.cancellation_reason ? `: ${modal.slot.cancellation_reason}` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Booking stats */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] flex flex-col gap-0.5">
                <span className="text-xl font-bold text-[var(--color-text)]">
                  {modal.slot.confirmed_count}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Confermati
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] flex flex-col gap-0.5">
                <span className="text-xl font-bold text-[var(--color-text)]">
                  {modal.slot.waitlist_count}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  In attesa
                </span>
              </div>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] flex flex-col gap-0.5">
                <span className="text-xl font-bold text-[var(--color-text)]">
                  {Math.max(0, modal.slot.capacity - modal.slot.confirmed_count)}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Liberi
                </span>
              </div>
            </div>

            {/* Cancel slot */}
            {!modal.slot.is_cancelled && (
              <div className="flex flex-col gap-3 pt-2 border-t border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  Cancella slot
                </p>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Motivazione (opzionale)"
                  className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] transition-colors"
                />
                {error && (
                  <p className="text-sm text-[var(--color-error)]">{error}</p>
                )}
                <Button
                  variant="danger"
                  fullWidth
                  loading={isPending}
                  onClick={handleCancelSlot}
                >
                  Cancella Slot
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
