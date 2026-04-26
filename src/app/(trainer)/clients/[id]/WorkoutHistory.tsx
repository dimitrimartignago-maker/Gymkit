"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import type { WorkoutLogSummary, WorkoutExerciseLog } from "./actions";

interface Props {
  logs: WorkoutLogSummary[];
}

function formatDuration(started_at: string, completed_at: string): string {
  const mins = Math.max(
    0,
    Math.round(
      (new Date(completed_at).getTime() - new Date(started_at).getTime()) / 60000
    )
  );
  return `${mins} min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function avgOrDash(values: (number | null)[]): string {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return "—";
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(1);
}

function Stars({ rating }: { rating: number | null }) {
  if (rating === null || rating === undefined) return null;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={12}
          className={i < rating ? "text-[var(--color-accent)] fill-[var(--color-accent)]" : "text-[var(--color-border)]"}
        />
      ))}
    </span>
  );
}

function ExerciseAccordion({ ex }: { ex: WorkoutExerciseLog }) {
  const [open, setOpen] = useState(false);

  const avgKg = avgOrDash(ex.sets.map((s) => s.load_used));
  const avgRpe = avgOrDash(ex.sets.map((s) => s.rpe));

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)] transition-colors text-left"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-[var(--color-text)] truncate">
            {ex.exercise_name}
          </span>
          <span className="text-xs text-[var(--color-text-secondary)]">
            {ex.sets.length} serie · {avgKg !== "—" ? `${avgKg} kg` : "—"} avg · RPE {avgRpe} avg
          </span>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-[var(--color-text-secondary)] shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-[var(--color-text-secondary)] shrink-0" />
        )}
      </button>

      {/* Expanded: prescritto vs eseguito */}
      {open && (
        <div className="px-3 py-3 flex flex-col gap-2 bg-[var(--color-surface)]">
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-2 pb-1 border-b border-[var(--color-border)]">
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] opacity-70">
              Prescritto
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--color-text-secondary)] opacity-70">
              Eseguito
            </span>
          </div>

          {/* One row per set */}
          {Array.from({ length: Math.max(ex.sets_prescribed, ex.sets.length) }, (_, i) => {
            const set = ex.sets.find((s) => s.set_number === i + 1);
            const prescribedReps = ex.reps_prescription ?? "—";
            const prescribedLoad = ex.load_prescription ?? "—";

            const executedParts: string[] = [];
            if (set?.load_used != null) executedParts.push(`${set.load_used}${set.load_unit}`);
            if (set?.reps_done != null) executedParts.push(`× ${set.reps_done}`);
            const executedMain = executedParts.length > 0 ? executedParts.join(" ") : "—";
            const executedRpe = set?.rpe != null ? `RPE ${set.rpe}` : null;

            return (
              <div
                key={i}
                className="grid grid-cols-2 gap-2 py-1.5 text-xs border-b border-[var(--color-border)] last:border-0"
              >
                {/* Prescritto (grey) */}
                <div className="text-[var(--color-text-secondary)] flex flex-col gap-0.5">
                  <span>S{i + 1}: {prescribedReps}</span>
                  <span className="opacity-60">{prescribedLoad}</span>
                </div>

                {/* Eseguito (coloured) */}
                <div className="text-[var(--color-text)] flex flex-col gap-0.5">
                  <span>{executedMain}</span>
                  {executedRpe && (
                    <span className="text-[var(--color-accent)] opacity-80">{executedRpe}</span>
                  )}
                  {set?.notes && (
                    <span className="text-[var(--color-text-secondary)] italic opacity-70">{set.notes}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: WorkoutLogSummary }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
      {/* List row */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface)] transition-colors text-left"
      >
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--color-text)]">
              {log.plan_day_name}
            </span>
            <Stars rating={log.overall_rating} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <span>{formatDate(log.started_at)}</span>
            <span>·</span>
            <span>{formatDuration(log.started_at, log.completed_at)}</span>
            {log.overall_notes && (
              <>
                <span>·</span>
                <span className="truncate max-w-[200px] italic">
                  "{log.overall_notes.slice(0, 60)}{log.overall_notes.length > 60 ? "…" : ""}"
                </span>
              </>
            )}
          </div>
        </div>
        {open ? (
          <ChevronDown size={16} className="text-[var(--color-text-secondary)] shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-[var(--color-text-secondary)] shrink-0" />
        )}
      </button>

      {/* Detail: exercise accordions */}
      {open && (
        <div className="px-4 py-4 flex flex-col gap-3 bg-[var(--color-surface)]">
          {log.overall_notes && (
            <p className="text-sm text-[var(--color-text-secondary)] italic border-l-2 border-[var(--color-accent)] pl-3">
              "{log.overall_notes}"
            </p>
          )}
          {log.exercises.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Nessun esercizio registrato.</p>
          ) : (
            log.exercises.map((ex) => (
              <ExerciseAccordion key={ex.exercise_order} ex={ex} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function WorkoutHistory({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
        Nessun allenamento completato.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {logs.map((log) => (
        <LogRow key={log.id} log={log} />
      ))}
    </div>
  );
}
