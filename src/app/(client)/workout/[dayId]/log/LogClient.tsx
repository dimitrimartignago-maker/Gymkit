"use client";

import { Button } from "@/components/ui/Button";
import { NumericInput } from "@/components/ui/Input";
import { saveWorkoutLog } from "../../actions";
import { CheckCircle2, ChevronLeft, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

export interface ExerciseData {
  planExerciseId: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  loadPrescription: string;
  notes: string;
  supersetGroup: string;
}

interface SetLog {
  repsDone: number;
  loadUsed: number;
  rpe: number;
  notes: string;
}

interface Props {
  planId: string;
  day: { id: string; name: string };
  exercises: ExerciseData[];
}

function tryParseInt(s: string): number {
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function tryParseFloat(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function formatRest(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}min ${rem}s` : `${m}min`;
}

const RPE_LABELS: Record<number, string> = {
  1: "Molto facile", 2: "Facile", 3: "Moderato", 4: "Un po' duro",
  5: "Duro", 6: "Duro+", 7: "Molto duro", 8: "Molto duro+",
  9: "Massimo quasi", 10: "Massimo",
};

export function LogClient({ planId, day, exercises }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const startedAt = useRef(new Date().toISOString());

  // Per-exercise, per-set state
  const [setLogs, setSetLogs] = useState<SetLog[][]>(() =>
    exercises.map((ex) => {
      const defaultReps = tryParseInt(ex.reps);
      const defaultLoad = tryParseFloat(ex.loadPrescription);
      return Array.from({ length: ex.sets }, () => ({
        repsDone: defaultReps,
        loadUsed: defaultLoad,
        rpe: 0,
        notes: "",
      }));
    })
  );

  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);
  const [phase, setPhase] = useState<"logging" | "summary">("logging");
  const [overallRating, setOverallRating] = useState(0);
  const [overallNotes, setOverallNotes] = useState("");
  const [saveError, setSaveError] = useState("");

  const currentEx = exercises[currentExIdx];
  const currentSet = setLogs[currentExIdx][currentSetIdx];

  function patchCurrentSet(patch: Partial<SetLog>) {
    setSetLogs((prev) => {
      const next = prev.map((row) => [...row]);
      next[currentExIdx][currentSetIdx] = {
        ...next[currentExIdx][currentSetIdx],
        ...patch,
      };
      return next;
    });
  }

  function completeSet() {
    const isLastSet = currentSetIdx === currentEx.sets - 1;
    const isLastExercise = currentExIdx === exercises.length - 1;

    if (!isLastSet) {
      setCurrentSetIdx((s) => s + 1);
    } else if (!isLastExercise) {
      setCurrentExIdx((e) => e + 1);
      setCurrentSetIdx(0);
    } else {
      setPhase("summary");
    }
  }

  function goToExercise(idx: number) {
    setCurrentExIdx(idx);
    setCurrentSetIdx(0);
  }

  function handleSave() {
    setSaveError("");
    startTransition(async () => {
      const allSets = exercises.flatMap((ex, eIdx) =>
        setLogs[eIdx].map((s, sIdx) => ({
          plan_exercise_id: ex.planExerciseId,
          set_number: sIdx + 1,
          reps_done: s.repsDone > 0 ? s.repsDone : null,
          load_used: s.loadUsed > 0 ? s.loadUsed : null,
          rpe: s.rpe > 0 ? s.rpe : null,
          notes: s.notes,
        }))
      );

      const result = await saveWorkoutLog({
        plan_id: planId,
        plan_day_id: day.id,
        started_at: startedAt.current,
        sets: allSets,
        overall_rating: overallRating > 0 ? overallRating : null,
        overall_notes: overallNotes,
      });

      if (result.success) {
        router.push("/workout");
        router.refresh();
      } else {
        setSaveError(result.error ?? "Errore imprevisto.");
      }
    });
  }

  // ── SUMMARY SCREEN ────────────────────────────────────────────────────────
  if (phase === "summary") {
    return (
      <div className="min-h-[calc(100vh-var(--bottom-bar-height))] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
          <button
            onClick={() => setPhase("logging")}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <span className="font-semibold text-[var(--color-text)]">
            Riepilogo
          </span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start p-6 gap-8">
          {/* Completion icon */}
          <div className="flex flex-col items-center gap-3 text-center pt-4">
            <div className="w-20 h-20 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text)]">
                Allenamento completato!
              </h2>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                {day.name} · {exercises.length} esercizi
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="w-full flex flex-col gap-3">
            <span className="text-sm font-medium text-[var(--color-text)]">
              Come è andato?
            </span>
            <div className="flex gap-3 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setOverallRating(n === overallRating ? 0 : n)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={36}
                    className={
                      n <= overallRating
                        ? "text-[var(--color-accent)] fill-[var(--color-accent)]"
                        : "text-[var(--color-text-secondary)]"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="w-full flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Note (opzionale)
            </label>
            <textarea
              value={overallNotes}
              onChange={(e) => setOverallNotes(e.target.value)}
              placeholder="Come ti sei sentito? Qualcosa da ricordare…"
              rows={4}
              className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
            />
          </div>

          {saveError && (
            <p className="text-sm text-[var(--color-error)]">{saveError}</p>
          )}

          <Button
            size="lg"
            fullWidth
            loading={isPending}
            onClick={handleSave}
          >
            Salva Allenamento
          </Button>
        </div>
      </div>
    );
  }

  // ── LOGGING SCREEN ────────────────────────────────────────────────────────
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets, 0);
  const doneSets =
    exercises.slice(0, currentExIdx).reduce((acc, ex) => acc + ex.sets, 0) +
    currentSetIdx;

  const progressPct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  return (
    <div className="min-h-[calc(100vh-var(--bottom-bar-height))] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/workout"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
          >
            <X size={24} />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {day.name}
            </p>
          </div>
          <button
            onClick={() => setPhase("summary")}
            className="text-xs text-[var(--color-accent)] font-semibold hover:opacity-80"
          >
            Finisci
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-[var(--color-overlay-md)]">
          <div
            className="h-full bg-[var(--color-accent)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Exercise navigation pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
        {exercises.map((ex, idx) => (
          <button
            key={ex.planExerciseId}
            onClick={() => goToExercise(idx)}
            className={[
              "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              idx === currentExIdx
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
            ].join(" ")}
          >
            {idx + 1}. {ex.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col px-4 pb-4 gap-5">
        {/* Exercise header */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-[var(--color-text)] leading-tight">
              {currentEx.name}
            </h2>
            <span className="text-xs text-[var(--color-text-secondary)] shrink-0 mt-1">
              {currentExIdx + 1}/{exercises.length}
            </span>
          </div>
          {currentEx.muscleGroup && (
            <span className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wide font-medium">
              {currentEx.muscleGroup}
            </span>
          )}

          {/* Prescription */}
          <div className="flex flex-wrap gap-2 mt-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)]">
              {currentEx.sets} × {currentEx.reps}
            </span>
            {currentEx.loadPrescription && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)]">
                {currentEx.loadPrescription}
              </span>
            )}
            {currentEx.restSeconds > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--color-surface-raised)] text-xs text-[var(--color-text-secondary)]">
                Rest {formatRest(currentEx.restSeconds)}
              </span>
            )}
          </div>

          {currentEx.notes && (
            <p className="text-xs text-[var(--color-text-secondary)] italic border-l-2 border-[var(--color-accent)]/40 pl-2 mt-1">
              {currentEx.notes}
            </p>
          )}
        </div>

        {/* Set indicator */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--color-text)]">
            Set {currentSetIdx + 1}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            / {currentEx.sets}
          </span>
          <div className="flex gap-1 ml-2">
            {Array.from({ length: currentEx.sets }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSetIdx(i)}
                className={[
                  "w-6 h-2 rounded-full transition-colors",
                  i === currentSetIdx
                    ? "bg-[var(--color-accent)]"
                    : i < currentSetIdx
                    ? "bg-[var(--color-accent)]/40"
                    : "bg-[var(--color-overlay-lg)]",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Set inputs */}
        <div className="flex flex-col gap-5">
          <NumericInput
            label="Ripetizioni"
            value={currentSet.repsDone}
            onChange={(v) => patchCurrentSet({ repsDone: v })}
            min={0}
            max={999}
            unit="reps"
          />

          <NumericInput
            label="Carico"
            value={currentSet.loadUsed}
            onChange={(v) => patchCurrentSet({ loadUsed: v })}
            min={0}
            max={999}
            step={2.5}
            unit="kg"
          />

          {/* RPE selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--color-text)]">
                RPE{" "}
                <span className="text-[var(--color-text-secondary)] font-normal">
                  (opzionale)
                </span>
              </span>
              {currentSet.rpe > 0 && (
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {RPE_LABELS[currentSet.rpe]}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    patchCurrentSet({ rpe: n === currentSet.rpe ? 0 : n })
                  }
                  className={[
                    "shrink-0 w-10 h-10 rounded-full text-sm font-semibold transition-colors",
                    n === currentSet.rpe
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]",
                  ].join(" ")}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Note set{" "}
              <span className="text-[var(--color-text-secondary)] font-normal">
                (opzionale)
              </span>
            </label>
            <input
              type="text"
              value={currentSet.notes}
              onChange={(e) => patchCurrentSet({ notes: e.target.value })}
              placeholder="Es. tecnica migliorata, forma migliore…"
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] transition-colors"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-auto pt-2">
          {(currentExIdx > 0 || currentSetIdx > 0) && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                if (currentSetIdx > 0) {
                  setCurrentSetIdx((s) => s - 1);
                } else {
                  setCurrentExIdx((e) => e - 1);
                  setCurrentSetIdx(exercises[currentExIdx - 1].sets - 1);
                }
              }}
              className="shrink-0 w-14"
            >
              <ChevronLeft size={20} />
            </Button>
          )}

          <Button size="lg" fullWidth onClick={completeSet}>
            {currentSetIdx < currentEx.sets - 1
              ? `Completa Set · ${currentSetIdx + 1}/${currentEx.sets}`
              : currentExIdx < exercises.length - 1
              ? "Prossimo Esercizio →"
              : "Vai al Riepilogo →"}
          </Button>
        </div>
      </div>
    </div>
  );
}
