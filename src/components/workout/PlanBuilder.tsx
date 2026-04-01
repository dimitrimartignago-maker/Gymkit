"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumericInput } from "@/components/ui/Input";
import { ExercisePicker, type ExerciseRow } from "./ExercisePicker";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Database } from "@/lib/supabase/types";
import { savePlan } from "@/app/(trainer)/plans/actions";
import { saveAsTemplate } from "@/app/(trainer)/plans/saveAsTemplate/actions";
import { useRouter } from "next/navigation";

type ClientRow = Database["public"]["Tables"]["profiles"]["Row"];

// ---- Draft types ----

export interface ExerciseDraft {
  tempId: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  restSeconds: number;
  loadPrescription: string;
  notes: string;
  supersetGroup: string;
}

export interface DayDraft {
  tempId: string;
  name: string;
  exercises: ExerciseDraft[];
}

export interface PlanDraft {
  id?: string; // present in edit mode
  clientId: string | null;
  name: string;
  description: string;
  startsAt: string;
  expiresAt: string;
  days: DayDraft[];
}

interface Props {
  gymId: string;
  trainerId: string;
  clients: ClientRow[];
  exercises: ExerciseRow[];
  initialPlan?: PlanDraft;
  defaultClientId?: string;
  isTemplate?: boolean;
  onSaveAsTemplate?: () => void;
}

// STEPS is defined dynamically inside the component based on isTemplate

function StepIndicator({ current, steps }: { current: number; steps: string[] }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-1 shrink-0">
          <div
            className={[
              "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
              i < current
                ? "bg-[var(--color-success)] text-black"
                : i === current
                ? "bg-[var(--color-accent)] text-white"
                : "bg-[var(--color-overlay-md)] text-[var(--color-text-secondary)]",
            ].join(" ")}
          >
            {i < current ? "✓" : i + 1}
          </div>
          <span
            className={[
              "text-xs whitespace-nowrap",
              i === current
                ? "text-[var(--color-text)] font-medium"
                : "text-[var(--color-text-secondary)]",
            ].join(" ")}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <ChevronRight size={12} className="text-white/20 mx-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

export function PlanBuilder({
  clients,
  exercises,
  initialPlan,
  defaultClientId,
  isTemplate,
  onSaveAsTemplate,
}: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [templateSaved, setTemplateSaved] = useState(false);

  const STEPS = isTemplate
    ? ["Info", "Giornate", "Esercizi", "Review"]
    : ["Cliente & Info", "Giornate", "Esercizi", "Review"];

  const [plan, setPlan] = useState<PlanDraft>(
    initialPlan ?? {
      clientId: isTemplate ? null : (defaultClientId ?? ""),
      name: "",
      description: "",
      startsAt: "",
      expiresAt: "",
      days: [],
    }
  );

  // Step 3: selected day index
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ---- Step 1 validation ----
  const step1Valid = isTemplate
    ? plan.name.trim() !== ""
    : plan.clientId !== "" && plan.clientId !== null && plan.name.trim() !== "";

  // ---- Helpers ----

  const updateDay = (idx: number, patch: Partial<DayDraft>) =>
    setPlan((p) => {
      const days = [...p.days];
      days[idx] = { ...days[idx], ...patch };
      return { ...p, days };
    });

  const addDay = () =>
    setPlan((p) => ({
      ...p,
      days: [
        ...p.days,
        { tempId: uuidv4(), name: `Giorno ${p.days.length + 1}`, exercises: [] },
      ],
    }));

  const removeDay = (idx: number) =>
    setPlan((p) => ({ ...p, days: p.days.filter((_, i) => i !== idx) }));

  const moveDay = (idx: number, dir: -1 | 1) =>
    setPlan((p) => {
      const days = [...p.days];
      const target = idx + dir;
      if (target < 0 || target >= days.length) return p;
      [days[idx], days[target]] = [days[target], days[idx]];
      return { ...p, days };
    });

  const addExercise = (ex: ExerciseRow) =>
    setPlan((p) => {
      const days = [...p.days];
      days[activeDayIdx] = {
        ...days[activeDayIdx],
        exercises: [
          ...days[activeDayIdx].exercises,
          {
            tempId: uuidv4(),
            exerciseId: ex.id,
            exerciseName: ex.name,
            muscleGroup: ex.muscle_group,
            sets: 3,
            reps: "8-12",
            restSeconds: 90,
            loadPrescription: "",
            notes: "",
            supersetGroup: "",
          },
        ],
      };
      return { ...p, days };
    });

  const updateExercise = (
    dayIdx: number,
    exTempId: string,
    patch: Partial<ExerciseDraft>
  ) =>
    setPlan((p) => {
      const days = [...p.days];
      days[dayIdx] = {
        ...days[dayIdx],
        exercises: days[dayIdx].exercises.map((e) =>
          e.tempId === exTempId ? { ...e, ...patch } : e
        ),
      };
      return { ...p, days };
    });

  const removeExercise = (dayIdx: number, exTempId: string) =>
    setPlan((p) => {
      const days = [...p.days];
      days[dayIdx] = {
        ...days[dayIdx],
        exercises: days[dayIdx].exercises.filter((e) => e.tempId !== exTempId),
      };
      return { ...p, days };
    });

  const moveExercise = (dayIdx: number, exIdx: number, dir: -1 | 1) =>
    setPlan((p) => {
      const days = [...p.days];
      const exs = [...days[dayIdx].exercises];
      const target = exIdx + dir;
      if (target < 0 || target >= exs.length) return p;
      [exs[exIdx], exs[target]] = [exs[target], exs[exIdx]];
      days[dayIdx] = { ...days[dayIdx], exercises: exs };
      return { ...p, days };
    });

  // ---- Save as template ----

  async function handleSaveAsTemplate() {
    if (!plan.id) return;
    startTransition(async () => {
      const result = await saveAsTemplate(plan.id!);
      if (result.success) {
        setTemplateSaved(true);
        setTimeout(() => setTemplateSaved(false), 3000);
      }
    });
  }

  // ---- Save ----

  const handleSave = (status: "draft" | "active") => {
    setSaveError(null);
    startTransition(async () => {
      const result = await savePlan({ ...plan, days: plan.days }, status);
      if (result.success) {
        if (isTemplate) {
          router.push(`/templates`);
        } else {
          router.push(`/clients/${plan.clientId}`);
        }
        router.refresh();
      } else {
        setSaveError(result.error);
      }
    });
  };

  // ---- Renders ----

  const renderStep1 = () => (
    <div className="flex flex-col gap-5">
      {!isTemplate && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Cliente *</label>
          <select
            value={plan.clientId ?? ""}
            onChange={(e) => setPlan((p) => ({ ...p, clientId: e.target.value }))}
            className="h-[var(--input-height)] rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
          >
            <option value="">Seleziona cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <Input
        label="Nome scheda *"
        value={plan.name}
        onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
        placeholder="es. Scheda Massa — Fase 1"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">Descrizione</label>
        <textarea
          value={plan.description}
          onChange={(e) => setPlan((p) => ({ ...p, description: e.target.value }))}
          placeholder="Note generali sulla scheda…"
          rows={2}
          className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none resize-none text-sm placeholder:text-[var(--color-text-secondary)]"
        />
      </div>

      <div className="flex gap-3">
        <Input
          label="Inizio (opzionale)"
          type="date"
          value={plan.startsAt}
          onChange={(e) => setPlan((p) => ({ ...p, startsAt: e.target.value }))}
        />
        <Input
          label="Fine (opzionale)"
          type="date"
          value={plan.expiresAt}
          onChange={(e) => setPlan((p) => ({ ...p, expiresAt: e.target.value }))}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="flex flex-col gap-4">
      {plan.days.length === 0 && (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
          Nessuna giornata. Aggiungine una.
        </p>
      )}
      {plan.days.map((day, i) => (
        <div
          key={day.tempId}
          className="flex items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]"
        >
          <span className="text-xs text-[var(--color-text-secondary)] w-5 shrink-0">
            {i + 1}.
          </span>
          <input
            value={day.name}
            onChange={(e) => updateDay(i, { name: e.target.value })}
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none border-b border-[var(--color-border-strong)] focus:border-[var(--color-accent)] pb-0.5"
            placeholder="Nome giornata"
          />
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => moveDay(i, -1)}
              disabled={i === 0}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => moveDay(i, 1)}
              disabled={i === plan.days.length - 1}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => removeDay(i)}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <Button variant="secondary" size="md" onClick={addDay}>
        <Plus size={16} /> Aggiungi giornata
      </Button>
    </div>
  );

  const renderStep3 = () => {
    if (plan.days.length === 0)
      return (
        <p className="text-sm text-[var(--color-text-secondary)] text-center py-8">
          Aggiungi almeno una giornata nel passo precedente.
        </p>
      );

    const activeDay = plan.days[activeDayIdx];

    return (
      <div className="flex flex-col gap-4">
        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {plan.days.map((day, i) => (
            <button
              key={day.tempId}
              type="button"
              onClick={() => setActiveDayIdx(i)}
              className={[
                "shrink-0 px-3 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium transition-colors",
                i === activeDayIdx
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
              ].join(" ")}
            >
              {day.name}
            </button>
          ))}
        </div>

        {/* Exercise list */}
        {activeDay.exercises.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
            Nessun esercizio in {activeDay.name}.
          </p>
        )}

        {activeDay.exercises.map((ex, exIdx) => (
          <div
            key={ex.tempId}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] p-3 flex flex-col gap-3"
          >
            {/* Exercise header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-[var(--color-text)]">
                  {ex.exerciseName}
                </span>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {ex.muscleGroup}
                </span>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => moveExercise(activeDayIdx, exIdx, -1)}
                  disabled={exIdx === 0}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => moveExercise(activeDayIdx, exIdx, 1)}
                  disabled={exIdx === activeDay.exercises.length - 1}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] disabled:opacity-30"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeExercise(activeDayIdx, ex.tempId)}
                  className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Fields row 1 */}
            <div className="grid grid-cols-2 gap-3">
              <NumericInput
                label="Serie"
                value={ex.sets}
                onChange={(v) => updateExercise(activeDayIdx, ex.tempId, { sets: v })}
                min={1}
                max={20}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">Reps</label>
                <input
                  value={ex.reps}
                  onChange={(e) =>
                    updateExercise(activeDayIdx, ex.tempId, { reps: e.target.value })
                  }
                  placeholder="es. 8-12 / AMRAP"
                  className="h-[var(--input-height)] rounded-[var(--radius-md)] px-3 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm font-mono"
                />
              </div>
            </div>

            {/* Fields row 2 */}
            <div className="grid grid-cols-2 gap-3">
              <NumericInput
                label="Riposo (sec)"
                value={ex.restSeconds}
                onChange={(v) =>
                  updateExercise(activeDayIdx, ex.tempId, { restSeconds: v })
                }
                min={0}
                max={600}
                step={15}
                unit="s"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[var(--color-text)]">Carico</label>
                <input
                  value={ex.loadPrescription}
                  onChange={(e) =>
                    updateExercise(activeDayIdx, ex.tempId, {
                      loadPrescription: e.target.value,
                    })
                  }
                  placeholder="es. RPE 8 / 70%1RM"
                  className="h-[var(--input-height)] rounded-[var(--radius-md)] px-3 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm font-mono"
                />
              </div>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Nota per il cliente
              </label>
              <input
                value={ex.notes}
                onChange={(e) =>
                  updateExercise(activeDayIdx, ex.tempId, { notes: e.target.value })
                }
                placeholder="es. Arco scapolare, fermo al petto 1s"
                className="h-10 rounded-[var(--radius-md)] px-3 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
              />
            </div>

            {/* Superset */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Superset (opzionale)
              </label>
              <input
                value={ex.supersetGroup}
                onChange={(e) =>
                  updateExercise(activeDayIdx, ex.tempId, {
                    supersetGroup: e.target.value,
                  })
                }
                placeholder="es. A  (stesso valore = superset)"
                className="h-10 rounded-[var(--radius-md)] px-3 bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm font-mono"
              />
            </div>
          </div>
        ))}

        <Button
          variant="secondary"
          size="md"
          onClick={() => setPickerOpen(true)}
        >
          <Plus size={16} /> Aggiungi esercizio
        </Button>

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          exercises={exercises}
          onSelect={addExercise}
        />
      </div>
    );
  };

  const renderStep4 = () => {
    const client = clients.find((c) => c.id === plan.clientId);
    const totalExercises = plan.days.reduce((s, d) => s + d.exercises.length, 0);

    return (
      <div className="flex flex-col gap-5">
        <div className="bg-[var(--color-surface-raised)] rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
          {!isTemplate && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Cliente</span>
            <span className="text-sm font-medium text-[var(--color-text)]">
              {client ? `${client.first_name} ${client.last_name}` : "—"}
            </span>
          </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Scheda</span>
            <span className="text-sm font-medium text-[var(--color-text)]">{plan.name}</span>
          </div>
          {plan.startsAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Periodo</span>
              <span className="text-sm text-[var(--color-text)]">
                {plan.startsAt} → {plan.expiresAt || "…"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Giornate</span>
            <span className="text-sm font-medium text-[var(--color-text)]">
              {plan.days.length}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">Esercizi totali</span>
            <span className="text-sm font-medium text-[var(--color-text)]">
              {totalExercises}
            </span>
          </div>
        </div>

        {plan.days.map((day) => (
          <div key={day.tempId} className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">{day.name}</p>
            {day.exercises.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)] italic">
                Nessun esercizio
              </p>
            ) : (
              day.exercises.map((ex) => (
                <div
                  key={ex.tempId}
                  className="flex items-center justify-between text-sm px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)]"
                >
                  <span className="text-[var(--color-text)] truncate">{ex.exerciseName}</span>
                  <span className="text-[var(--color-text-secondary)] font-mono shrink-0 ml-2">
                    {ex.sets}×{ex.reps}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}

        {saveError && (
          <p className="text-sm text-[var(--color-error)]">{saveError}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            onClick={() => handleSave("draft")}
            loading={isPending}
          >
            Salva bozza
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => handleSave("active")}
            loading={isPending}
            disabled={plan.days.length === 0}
          >
            Pubblica
          </Button>
        </div>

        {!isTemplate && plan.id && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveAsTemplate}
            disabled={isPending}
          >
            Salva come template
          </Button>
        )}
        {templateSaved && (
          <p className="text-sm text-[var(--color-success)] text-center">
            ✓ Template salvato —{" "}
            <a href="/templates" className="underline">Vedi template</a>
          </p>
        )}
      </div>
    );
  };

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <StepIndicator current={step} steps={STEPS} />

      <div>{stepContent[step]()}</div>

      {/* Navigation */}
      {step < STEPS.length - 1 && (
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep((s) => s - 1)}
            >
              Indietro
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 0 && !step1Valid}
          >
            Avanti
          </Button>
        </div>
      )}
      {step === STEPS.length - 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((s) => s - 1)}
        >
          ← Modifica
        </Button>
      )}
    </div>
  );
}
