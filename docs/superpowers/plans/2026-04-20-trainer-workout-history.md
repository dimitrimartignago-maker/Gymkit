# Trainer Workout History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Storico" tab to the trainer client detail page showing completed workout logs with per-set prescritto vs eseguito comparison.

**Architecture:** Three pieces — (1) a server action that queries Supabase joining workout_logs → plan_days, workout_log_sets, plan_exercises, exercises; (2) a client component `WorkoutHistory` that renders the list with two-level accordion (per allenamento, per esercizio); (3) a small update to `page.tsx` to add tab navigation and conditionally load the data.

**Tech Stack:** Next.js 14 App Router, Supabase (admin client via getTrainerContext), TypeScript, Tailwind CSS, React useState for accordion state.

---

### Task 1: Server action `getClientWorkoutHistory`

**Files:**
- Create: `src/app/(trainer)/clients/[id]/actions.ts`

- [ ] **Step 1: Create the file with types and action**

```typescript
// src/app/(trainer)/clients/[id]/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface WorkoutSetLog {
  set_number: number;
  reps_done: number | null;
  load_used: number | null;
  load_unit: string;
  rpe: number | null;
  notes: string | null;
}

export interface WorkoutExerciseLog {
  exercise_name: string;
  exercise_order: number;
  sets_prescribed: number;
  reps_prescription: string | null;
  load_prescription: string | null;
  sets: WorkoutSetLog[];
}

export interface WorkoutLogSummary {
  id: string;
  plan_day_name: string;
  started_at: string;
  completed_at: string;
  overall_rating: number | null;
  overall_notes: string | null;
  exercises: WorkoutExerciseLog[];
}

type RawLog = {
  id: string;
  started_at: string;
  completed_at: string;
  overall_rating: number | null;
  overall_notes: string | null;
  plan_days: { name: string } | null;
  workout_log_sets: Array<{
    set_number: number;
    reps_done: number | null;
    load_used: number | null;
    load_unit: string;
    rpe: number | null;
    notes: string | null;
    plan_exercises: {
      sets: number;
      reps: string;
      load_prescription: string | null;
      exercise_order: number;
      exercises: { name: string } | null;
    } | null;
  }>;
};

export async function getClientWorkoutHistory(
  clientId: string
): Promise<WorkoutLogSummary[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("workout_logs")
    .select(`
      id, started_at, completed_at, overall_rating, overall_notes,
      plan_days(name),
      workout_log_sets(
        set_number, reps_done, load_used, load_unit, rpe, notes,
        plan_exercises(
          sets, reps, load_prescription, exercise_order,
          exercises(name)
        )
      )
    `)
    .eq("client_id", clientId)
    .not("completed_at", "is", null)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return (data as unknown as RawLog[]).map((log) => {
    // Group sets by plan_exercise_id equivalent (exercise_order + name)
    const exerciseMap = new Map<number, WorkoutExerciseLog>();

    for (const s of log.workout_log_sets) {
      const pe = s.plan_exercises;
      if (!pe) continue;
      const order = pe.exercise_order;

      if (!exerciseMap.has(order)) {
        exerciseMap.set(order, {
          exercise_name: pe.exercises?.name ?? "Esercizio",
          exercise_order: order,
          sets_prescribed: pe.sets,
          reps_prescription: pe.reps ?? null,
          load_prescription: pe.load_prescription,
          sets: [],
        });
      }

      exerciseMap.get(order)!.sets.push({
        set_number: s.set_number,
        reps_done: s.reps_done,
        load_used: s.load_used,
        load_unit: s.load_unit,
        rpe: s.rpe,
        notes: s.notes,
      });
    }

    // Sort exercises by order, sets by set_number
    const exercises = Array.from(exerciseMap.values())
      .sort((a, b) => a.exercise_order - b.exercise_order)
      .map((ex) => ({
        ...ex,
        sets: ex.sets.sort((a, b) => a.set_number - b.set_number),
      }));

    return {
      id: log.id,
      plan_day_name: log.plan_days?.name ?? "Allenamento",
      started_at: log.started_at,
      completed_at: log.completed_at,
      overall_rating: log.overall_rating,
      overall_notes: log.overall_notes,
      exercises,
    };
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output (zero errors).

- [ ] **Step 3: Commit**

```bash
git add src/app/\(trainer\)/clients/\[id\]/actions.ts
git commit -m "feat(trainer): add getClientWorkoutHistory server action"
```

---

### Task 2: `WorkoutHistory` client component

**Files:**
- Create: `src/app/(trainer)/clients/[id]/WorkoutHistory.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/app/(trainer)/clients/[id]/WorkoutHistory.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Star } from "lucide-react";
import type { WorkoutLogSummary, WorkoutExerciseLog } from "./actions";

interface Props {
  logs: WorkoutLogSummary[];
}

function formatDuration(started_at: string, completed_at: string): string {
  const mins = Math.round(
    (new Date(completed_at).getTime() - new Date(started_at).getTime()) / 60000
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
  if (!rating) return null;
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1 | head -20
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(trainer\)/clients/\[id\]/WorkoutHistory.tsx
git commit -m "feat(trainer): add WorkoutHistory accordion component"
```

---

### Task 3: Add "Storico" tab to client detail page

**Files:**
- Modify: `src/app/(trainer)/clients/[id]/page.tsx`

- [ ] **Step 1: Replace the file**

```typescript
// src/app/(trainer)/clients/[id]/page.tsx
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalsEditor } from "./GoalsEditor";
import { WorkoutHistory } from "./WorkoutHistory";
import { getClientWorkoutHistory } from "./actions";

type PlanStatus = Database["public"]["Tables"]["workout_plans"]["Row"]["status"];

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { supabase, profile } = await getTrainerContext();
  const tab = searchParams.tab === "storico" ? "storico" : "profilo";

  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", profile.id)
    .eq("client_id", params.id)
    .eq("is_active", true)
    .single();

  if (!relation) notFound();

  const clientRes = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, avatar_url, goals, created_at")
    .eq("id", params.id)
    .single();

  if (!clientRes.data) notFound();
  const client = clientRes.data;

  // Load tab-specific data
  const [plansData, historyData] = await Promise.all([
    tab === "profilo"
      ? supabase
          .from("workout_plans")
          .select("id, name, status, version, starts_at, expires_at, updated_at")
          .eq("client_id", params.id)
          .eq("trainer_id", profile.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    tab === "storico"
      ? getClientWorkoutHistory(params.id)
      : Promise.resolve([]),
  ]);

  const plans = (plansData.data ?? []) as Database["public"]["Tables"]["workout_plans"]["Row"][];
  const activePlans   = plans.filter((p) => p.status === "active");
  const draftPlans    = plans.filter((p) => p.status === "draft");
  const archivedPlans = plans.filter((p) => p.status === "archived");

  const PlanCard = ({ plan }: { plan: (typeof plans)[number] }) => (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)] truncate">{plan.name}</span>
          <Badge variant={plan.status as PlanStatus} />
        </div>
        <div className="flex gap-3 text-xs text-[var(--color-text-secondary)]">
          <span>v{plan.version}</span>
          {plan.starts_at && (
            <span>{plan.starts_at}{plan.expires_at && ` → ${plan.expires_at}`}</span>
          )}
        </div>
      </div>
      <Link href={`/plans/${plan.id}/edit`}>
        <Button variant="ghost" size="sm">Modifica</Button>
      </Link>
    </div>
  );

  const tabClass = (active: boolean) =>
    [
      "px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors",
      active
        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
        : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
    ].join(" ");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <Link
        href="/clients"
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Tutti i clienti
      </Link>

      {/* Header */}
      <Card className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-bold text-lg shrink-0">
          {client.first_name?.[0]?.toUpperCase()}
          {client.last_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            {client.first_name} {client.last_name}
          </h1>
          <span className="text-sm text-[var(--color-text-secondary)]">{client.email}</span>
          {client.phone && (
            <span className="text-sm text-[var(--color-text-secondary)]">{client.phone}</span>
          )}
        </div>
      </Card>

      {/* Tab nav */}
      <div className="flex border-b border-[var(--color-border)] -mb-3">
        <Link href={`/clients/${params.id}`} className={tabClass(tab === "profilo")}>
          Profilo
        </Link>
        <Link href={`/clients/${params.id}?tab=storico`} className={tabClass(tab === "storico")}>
          Storico
        </Link>
      </div>

      {/* Tab: Profilo */}
      {tab === "profilo" && (
        <>
          <GoalsEditor clientId={params.id} initialGoals={client.goals ?? ""} />

          <Link href={`/clients/${params.id}/plans/new`}>
            <Button variant="primary" size="md" fullWidth>
              <Plus size={16} /> Nuova Scheda
            </Button>
          </Link>

          {activePlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Schede attive ({activePlans.length})
              </h2>
              {activePlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {draftPlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Bozze ({draftPlans.length})
              </h2>
              {draftPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {archivedPlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Archivio ({archivedPlans.length})
              </h2>
              {archivedPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {plans.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">
              Nessuna scheda assegnata a questo cliente.
            </p>
          )}
        </>
      )}

      {/* Tab: Storico */}
      {tab === "storico" && (
        <WorkoutHistory logs={historyData as WorkoutLogSummary[]} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add missing import for WorkoutLogSummary**

The import at the top already includes `WorkoutHistory` and `getClientWorkoutHistory` from `./actions`. However `WorkoutLogSummary` is also used as a type in the JSX. Verify the import line for actions already covers it:

```typescript
import { WorkoutHistory } from "./WorkoutHistory";
import { getClientWorkoutHistory } from "./actions";
import type { WorkoutLogSummary } from "./actions";
```

The step-1 file above already has `WorkoutHistory` and `getClientWorkoutHistory` imported but is missing `WorkoutLogSummary`. Add it to the actions import line:

```typescript
import { getClientWorkoutHistory } from "./actions";
import type { WorkoutLogSummary } from "./actions";
```

- [ ] **Step 3: Verify TypeScript compiles with zero errors**

```bash
cd /Users/dimitrimartignago/Gymkit && npx tsc --noEmit 2>&1
```
Expected: no output. If there are errors, fix them before continuing.

- [ ] **Step 4: Smoke test**

Start the dev server if not running:
```bash
npm run dev
```

Navigate to `http://localhost:3000/clients/<any-client-id>` and verify:
1. Two tabs appear: "Profilo" and "Storico"
2. "Profilo" tab shows existing content (goals, plans) — unchanged
3. Click "Storico" → URL becomes `?tab=storico`
4. If the client has completed workouts, rows appear with date, duration, stars
5. Click a row → expands showing exercises
6. Click an exercise → expands showing prescritto vs eseguito two-column grid
7. Click again → collapses
8. If no completed workouts → "Nessun allenamento completato." message

- [ ] **Step 5: Commit**

```bash
git add src/app/\(trainer\)/clients/\[id\]/page.tsx
git commit -m "feat(trainer): add Storico tab to client detail page"
```
