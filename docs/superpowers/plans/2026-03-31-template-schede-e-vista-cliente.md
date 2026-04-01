# Template Schede e Vista Cliente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere sistema di template schede per i trainer (crea, modifica, assegna da template) e migliorare la vista cliente con obiettivi e flusso dedicato di creazione scheda.

**Architecture:** Le workout_plans con `client_id = NULL` sono template. La funzione `clonePlan` gestisce la duplicazione completa (plan + days + exercises) sia per "crea da template" che per "salva come template". Il `PlanBuilder` esistente viene riutilizzato aggiungendo la prop `isTemplate` che nasconde la selezione cliente.

**Tech Stack:** Next.js 14 App Router, Supabase (admin client via service role), TypeScript, Tailwind CSS con design tokens CSS var.

---

## File Map

**Nuovi:**
- `supabase/migrations/20260331_template_system.sql` — migrazione DB
- `src/lib/actions/plans.ts` — clonePlan() riusabile
- `src/app/(trainer)/templates/page.tsx` — lista template
- `src/app/(trainer)/templates/new/page.tsx` — crea template (redirect all'editor)
- `src/app/(trainer)/templates/[id]/edit/page.tsx` — editor template
- `src/app/(trainer)/clients/[id]/plans/new/page.tsx` — crea scheda per cliente (da zero o da template)
- `src/app/(trainer)/clients/[id]/goals/actions.ts` — aggiorna obiettivi cliente

**Modificati:**
- `src/components/workout/PlanBuilder.tsx` — prop `isTemplate`, `onSaveAsTemplate`
- `src/app/(trainer)/plans/actions.ts` — savePlan supporta clientId nullable
- `src/app/(trainer)/layout.tsx` — aggiunge "Template" in nav
- `src/app/(trainer)/clients/[id]/page.tsx` — aggiunge Goals, link a /plans/new → /clients/[id]/plans/new

---

## Task 1: Migrazione Database

**Files:**
- Create: `supabase/migrations/20260331_template_system.sql`

- [ ] **Step 1: Crea il file di migrazione**

```sql
-- supabase/migrations/20260331_template_system.sql

-- client_id diventa nullable (template = workout_plan senza cliente)
ALTER TABLE workout_plans
  ALTER COLUMN client_id DROP NOT NULL;

-- da quale template deriva questa scheda
ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS source_template_id UUID REFERENCES workout_plans(id);

-- obiettivi del cliente (testo libero)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS goals TEXT;

-- indice per query template del trainer
CREATE INDEX IF NOT EXISTS idx_workout_plans_templates
  ON workout_plans(trainer_id)
  WHERE client_id IS NULL;
```

- [ ] **Step 2: Esegui la migrazione su Supabase**

Vai su Supabase Dashboard → SQL Editor, incolla il contenuto del file ed esegui.
Verifica che non ci siano errori.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260331_template_system.sql
git commit -m "feat: db migration - template system, nullable client_id, goals"
```

---

## Task 2: Utility clonePlan

**Files:**
- Create: `src/lib/actions/plans.ts`

- [ ] **Step 1: Crea la funzione**

```typescript
// src/lib/actions/plans.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function clonePlan(
  sourcePlanId: string,
  options: {
    clientId?: string | null;  // null o assente → template
    name?: string;             // se omesso, usa nome originale
  } = {}
): Promise<{ success: true; planId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();

    // 1. Leggi piano originale con tutte le relazioni
    const { data: source, error: sourceErr } = await admin
      .from("workout_plans")
      .select(`
        *,
        plan_days (
          *,
          plan_exercises (*)
        )
      `)
      .eq("id", sourcePlanId)
      .single();

    if (sourceErr || !source) return { success: false, error: "Piano non trovato." };

    // 2. Crea nuovo workout_plan
    const isTemplate = options.clientId === undefined || options.clientId === null;
    const { data: newPlan, error: planErr } = await admin
      .from("workout_plans")
      .insert({
        gym_id: source.gym_id,
        trainer_id: source.trainer_id,
        client_id: options.clientId ?? null,
        name: options.name ?? source.name,
        description: source.description,
        status: "draft",
        version: 1,
        starts_at: null,
        expires_at: null,
        source_template_id: isTemplate ? null : sourcePlanId,
      })
      .select("id")
      .single();

    if (planErr || !newPlan) return { success: false, error: "Errore nella clonazione." };

    // 3. Clona plan_days + plan_exercises
    type SourceDay = typeof source.plan_days[number];
    const sortedDays = [...(source.plan_days ?? [])].sort(
      (a: SourceDay, b: SourceDay) => a.day_order - b.day_order
    );

    for (let i = 0; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      const { data: newDay, error: dayErr } = await admin
        .from("plan_days")
        .insert({
          plan_id: newPlan.id,
          name: day.name,
          day_order: day.day_order,
          notes: day.notes,
        })
        .select("id")
        .single();

      if (dayErr || !newDay) return { success: false, error: "Errore clonazione giornata." };

      type SourceEx = typeof day.plan_exercises[number];
      const sortedExercises = [...(day.plan_exercises ?? [])].sort(
        (a: SourceEx, b: SourceEx) => a.exercise_order - b.exercise_order
      );

      if (sortedExercises.length > 0) {
        const { error: exErr } = await admin.from("plan_exercises").insert(
          sortedExercises.map((ex: SourceEx) => ({
            plan_day_id: newDay.id,
            exercise_id: ex.exercise_id,
            exercise_order: ex.exercise_order,
            sets: ex.sets,
            reps: ex.reps,
            rest_seconds: ex.rest_seconds,
            load_prescription: ex.load_prescription,
            notes: ex.notes,
            superset_group: ex.superset_group,
          }))
        );
        if (exErr) return { success: false, error: "Errore clonazione esercizi." };
      }
    }

    return { success: true, planId: newPlan.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Errore imprevisto." };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/actions/plans.ts
git commit -m "feat: clonePlan utility action"
```

---

## Task 3: Aggiorna savePlan per supportare clientId nullable

**Files:**
- Modify: `src/app/(trainer)/plans/actions.ts`

Il `PlanDraft.clientId` diventa `string | null`. Quando è null la scheda è un template.

- [ ] **Step 1: Aggiorna il tipo PlanDraft in PlanBuilder.tsx**

In `src/components/workout/PlanBuilder.tsx`, cambia:
```typescript
// DA:
export interface PlanDraft {
  id?: string;
  clientId: string;
  // ...
}

// A:
export interface PlanDraft {
  id?: string;
  clientId: string | null;
  // ...
}
```

- [ ] **Step 2: Aggiorna savePlan in plans/actions.ts**

Nel blocco `// ---- CREATE ----`, cambia:
```typescript
// DA:
client_id: plan.clientId,

// A:
client_id: plan.clientId ?? null,
```

Questo è sufficiente perché `""` e `null` sono entrambi gestiti come NULL in Supabase.

- [ ] **Step 3: Aggiorna step1Valid in PlanBuilder.tsx**

In `PlanBuilder.tsx`, vicino a `const step1Valid = ...`, leggi il valore attuale e aggiungi la gestione `isTemplate`:

```typescript
// Aggiunto props:
interface Props {
  gymId: string;
  trainerId: string;
  clients: ClientRow[];
  exercises: ExerciseRow[];
  initialPlan?: PlanDraft;
  defaultClientId?: string;
  isTemplate?: boolean;          // ← nuovo
  onSaveAsTemplate?: () => void; // ← nuovo (per bottone "Salva come template")
}

// Aggiornato step1Valid:
const step1Valid = isTemplate
  ? plan.name.trim() !== ""
  : plan.clientId !== "" && plan.clientId !== null && plan.name.trim() !== "";
```

- [ ] **Step 4: Nascondi selezione cliente quando isTemplate=true**

Nel render dello Step 0 (Cliente & Info), wrappa il select cliente in:
```tsx
{!isTemplate && (
  <div className="flex flex-col gap-1.5">
    {/* ... select cliente esistente ... */}
  </div>
)}
```

Aggiorna anche il testo del primo step: quando `isTemplate=true`, il label dello step diventa "Info" invece di "Cliente & Info".

Modifica `STEPS` rendendolo dinamico:
```typescript
const STEPS = isTemplate
  ? ["Info", "Giornate", "Esercizi", "Review"]
  : ["Cliente & Info", "Giornate", "Esercizi", "Review"];
```

- [ ] **Step 5: Imposta clientId = null quando isTemplate=true**

Nel `useState` iniziale del plan:
```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add src/components/workout/PlanBuilder.tsx src/app/(trainer)/plans/actions.ts
git commit -m "feat: PlanBuilder supports isTemplate mode, clientId nullable"
```

---

## Task 4: Pagina Lista Template

**Files:**
- Create: `src/app/(trainer)/templates/page.tsx`

- [ ] **Step 1: Crea la pagina**

```typescript
// src/app/(trainer)/templates/page.tsx
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { Button } from "@/components/ui/Button";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";

export default async function TemplatesPage() {
  const { profile } = await getTrainerContext();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from("workout_plans")
    .select(`
      id, name, description, status, created_at, updated_at,
      plan_days (id)
    `)
    .eq("trainer_id", profile.id)
    .is("client_id", null)
    .order("updated_at", { ascending: false });

  const list = (templates ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    plan_days: { id: string }[];
  }>;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Template Schede</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {list.length} template salvati
          </p>
        </div>
        <Link href="/templates/new">
          <Button size="sm">
            <Plus size={16} />
            Nuovo template
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <FileText size={40} className="text-[var(--color-text-secondary)] opacity-40" />
          <div>
            <p className="text-[var(--color-text)] font-medium">Nessun template ancora</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">
              Crea un template per riutilizzarlo su più clienti.
            </p>
          </div>
          <Link href="/templates/new">
            <Button variant="primary">Crea il primo template</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/edit`}
              className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-medium text-[var(--color-text)] truncate">{t.name}</span>
                {t.description && (
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {t.description}
                  </span>
                )}
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {t.plan_days.length} giornate ·{" "}
                  {new Date(t.updated_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <FileText size={18} className="text-[var(--color-text-secondary)] shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(trainer\)/templates/page.tsx
git commit -m "feat: templates list page"
```

---

## Task 5: Pagina Crea Template

**Files:**
- Create: `src/app/(trainer)/templates/new/page.tsx`

La pagina mostra solo un form nome+descrizione. Al submit, crea un piano vuoto (template) e fa redirect all'editor.

- [ ] **Step 1: Crea la pagina con form e server action inline**

```typescript
// src/app/(trainer)/templates/new/page.tsx
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTemplatePage() {
  return (
    <div className="p-4 md:p-6 max-w-lg flex flex-col gap-6">
      <Link
        href="/templates"
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Template
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Nuovo Template</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Dopo la creazione potrai aggiungere giornate ed esercizi.
        </p>
      </div>

      <form action={createTemplate} className="flex flex-col gap-4">
        <Input
          label="Nome template *"
          name="name"
          placeholder="Es. Scheda Full Body 3x, Programma Massa..."
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Descrizione</label>
          <textarea
            name="description"
            placeholder="Note sul template..."
            rows={3}
            className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
          />
        </div>
        <Button type="submit" fullWidth>
          Crea template
        </Button>
      </form>
    </div>
  );
}

async function createTemplate(formData: FormData) {
  "use server";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createClient } = await import("@/lib/supabase/server");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  const { data: newPlan } = await admin
    .from("workout_plans")
    .insert({
      gym_id: profile.gym_id,
      trainer_id: profile.id,
      client_id: null,
      name,
      description,
      status: "active",
      version: 1,
    })
    .select("id")
    .single();

  if (!newPlan) redirect("/templates");
  redirect(`/templates/${newPlan.id}/edit`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(trainer\)/templates/new/page.tsx
git commit -m "feat: new template creation page"
```

---

## Task 6: Editor Template

**Files:**
- Create: `src/app/(trainer)/templates/[id]/edit/page.tsx`

Riusa `PlanBuilder` con `isTemplate={true}`.

- [ ] **Step 1: Crea la pagina**

```typescript
// src/app/(trainer)/templates/[id]/edit/page.tsx
import { PlanBuilder, type DayDraft, type PlanDraft } from "@/components/workout/PlanBuilder";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { notFound } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

type ExerciseRow    = Database["public"]["Tables"]["exercises"]["Row"];
type WorkoutPlanRow = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanDayRow     = Database["public"]["Tables"]["plan_days"]["Row"];
type PlanExRow      = Database["public"]["Tables"]["plan_exercises"]["Row"];

type PlanWithDays = WorkoutPlanRow & {
  plan_days: (PlanDayRow & {
    plan_exercises: (PlanExRow & {
      exercises: { id: string; name: string; muscle_group: string } | null;
    })[];
  })[];
};

interface Props {
  params: { id: string };
}

export default async function EditTemplatePage({ params }: Props) {
  const { profile } = await getTrainerContext();
  const admin = createAdminClient();

  const [planRes, exercisesRes] = await Promise.all([
    admin
      .from("workout_plans")
      .select(`*, plan_days(*, plan_exercises(*, exercises(id, name, muscle_group)))`)
      .eq("id", params.id)
      .eq("trainer_id", profile.id)
      .is("client_id", null)
      .single(),
    admin
      .from("exercises")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true),
  ]);

  const rawPlan = (planRes.data ?? null) as unknown as PlanWithDays | null;
  if (!rawPlan) notFound();

  const days: DayDraft[] = [...(rawPlan.plan_days ?? [])]
    .sort((a, b) => a.day_order - b.day_order)
    .map((day) => ({
      tempId: uuidv4(),
      name: day.name,
      exercises: [...(day.plan_exercises ?? [])]
        .sort((a, b) => a.exercise_order - b.exercise_order)
        .map((pe) => ({
          tempId: uuidv4(),
          exerciseId: pe.exercise_id,
          exerciseName: pe.exercises?.name ?? "Esercizio",
          muscleGroup: pe.exercises?.muscle_group ?? "",
          sets: pe.sets,
          reps: pe.reps,
          restSeconds: pe.rest_seconds ?? 0,
          loadPrescription: pe.load_prescription ?? "",
          notes: pe.notes ?? "",
          supersetGroup: pe.superset_group ?? "",
        })),
    }));

  const initialPlan: PlanDraft = {
    id: rawPlan.id,
    clientId: null,
    name: rawPlan.name,
    description: rawPlan.description ?? "",
    startsAt: rawPlan.starts_at ?? "",
    expiresAt: rawPlan.expires_at ?? "",
    days,
  };

  const exercises = ((exercisesRes.data ?? []) as ExerciseRow[]).sort((a, b) => {
    const aOwn = a.created_by === profile.id ? 0 : 1;
    const bOwn = b.created_by === profile.id ? 0 : 1;
    return aOwn !== bOwn ? aOwn - bOwn : Number(a.is_default) - Number(b.is_default);
  });

  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-6 py-4">
        <h1 className="font-semibold text-[var(--color-text)]">
          Modifica Template
          <span className="ml-2 text-sm font-normal text-[var(--color-accent)]">template</span>
        </h1>
      </div>
      <PlanBuilder
        gymId={profile.gym_id}
        trainerId={profile.id}
        clients={[]}
        exercises={exercises}
        initialPlan={initialPlan}
        isTemplate={true}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(trainer\)/templates/\[id\]/edit/page.tsx
git commit -m "feat: template editor page"
```

---

## Task 7: Aggiorna Layout Trainer

**Files:**
- Modify: `src/app/(trainer)/layout.tsx`

Aggiunge "Template" come voce di navigazione (rimpiazza "Schede" che puntava a `/plans/new`).

- [ ] **Step 1: Modifica trainerNavItems**

In `layout.tsx`, nel array `trainerNavItems`, sostituisci la voce "Schede":

```typescript
// DA:
{
  href: "/plans/new",
  label: "Schede",
  icon: ( /* ... */ ),
},

// A:
{
  href: "/templates",
  label: "Template",
  icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
},
```

- [ ] **Step 2: Aggiorna il middleware per la route /templates**

In `src/middleware.ts`, la `ROUTE_ROLE_MAP` già mappa `/plans` a `"trainer"`. Aggiungi la nuova route:

```typescript
// Nel ROUTE_ROLE_MAP, aggiungi dopo /plans:
"/templates": "trainer",
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(trainer\)/layout.tsx src/middleware.ts
git commit -m "feat: add templates nav item, middleware route"
```

---

## Task 8: Vista Cliente Migliorata + Obiettivi

**Files:**
- Modify: `src/app/(trainer)/clients/[id]/page.tsx`
- Create: `src/app/(trainer)/clients/[id]/goals/actions.ts`

- [ ] **Step 1: Crea la server action per aggiornare gli obiettivi**

```typescript
// src/app/(trainer)/clients/[id]/goals/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateClientGoals(
  clientId: string,
  goals: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();

    // Verifica che il caller sia il trainer del cliente
    const { data: relation } = await admin
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .single();

    if (!relation) return { success: false, error: "Non autorizzato." };

    const { error } = await admin
      .from("profiles")
      .update({ goals: goals.trim() || null })
      .eq("id", clientId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/clients/${clientId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 2: Aggiorna clients/[id]/page.tsx**

Sostituisci il contenuto della pagina con la versione migliorata:

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

type PlanStatus = Database["public"]["Tables"]["workout_plans"]["Row"]["status"];

interface Props {
  params: { id: string };
}

export default async function ClientDetailPage({ params }: Props) {
  const { supabase, profile } = await getTrainerContext();

  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", profile.id)
    .eq("client_id", params.id)
    .eq("is_active", true)
    .single();

  if (!relation) notFound();

  const [clientRes, plansRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, avatar_url, goals, created_at")
      .eq("id", params.id)
      .single(),
    supabase
      .from("workout_plans")
      .select("id, name, status, version, previous_version_id, starts_at, expires_at, updated_at")
      .eq("client_id", params.id)
      .eq("trainer_id", profile.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (!clientRes.data) notFound();

  const client = clientRes.data;
  const plans = plansRes.data ?? [];

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

      {/* Obiettivi */}
      <GoalsEditor
        clientId={params.id}
        initialGoals={client.goals ?? ""}
      />

      {/* CTA nuova scheda */}
      <Link href={`/clients/${params.id}/plans/new`}>
        <Button variant="primary" size="md" fullWidth>
          <Plus size={16} /> Nuova Scheda
        </Button>
      </Link>

      {/* Schede attive */}
      {activePlans.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Schede attive ({activePlans.length})
          </h2>
          {activePlans.map((p) => <PlanCard key={p.id} plan={p} />)}
        </section>
      )}

      {/* Bozze */}
      {draftPlans.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">
            Bozze ({draftPlans.length})
          </h2>
          {draftPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
        </section>
      )}

      {/* Archivio */}
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
    </div>
  );
}
```

- [ ] **Step 3: Crea GoalsEditor (client component)**

```typescript
// src/app/(trainer)/clients/[id]/GoalsEditor.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { updateClientGoals } from "./goals/actions";
import { Target } from "lucide-react";

interface Props {
  clientId: string;
  initialGoals: string;
}

export function GoalsEditor({ clientId, initialGoals }: Props) {
  const [editing, setEditing] = useState(false);
  const [goals, setGoals] = useState(initialGoals);
  const [draft, setDraft] = useState(initialGoals);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const result = await updateClientGoals(clientId, draft);
      if (result.success) {
        setGoals(draft);
        setEditing(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
          <Target size={15} className="text-[var(--color-accent)]" />
          Obiettivi
        </div>
        {!editing && (
          <button
            onClick={() => { setDraft(goals); setEditing(true); }}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            Modifica
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Es. Perdere peso, aumentare massa, migliorare resistenza..."
            className="w-full rounded-[var(--radius-md)] px-3 py-2 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button size="sm" loading={loading} onClick={handleSave}>
              Salva
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--color-text-secondary)]">
          {goals || <span className="italic">Nessun obiettivo impostato</span>}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(trainer\)/clients/\[id\]/
git commit -m "feat: client detail page with goals editor"
```

---

## Task 9: Pagina Crea Scheda per Cliente (da zero o da template)

**Files:**
- Create: `src/app/(trainer)/clients/[id]/plans/new/page.tsx`

- [ ] **Step 1: Crea la pagina**

Crea due file separati — il server component (`page.tsx`) e il client component (`NewClientPlanPage.tsx`):

```typescript
// src/app/(trainer)/clients/[id]/plans/new/NewClientPlanPage.tsx  ← client component
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createPlanForClient } from "./actions";

interface Template {
  id: string;
  name: string;
  description: string | null;
  plan_days: { id: string }[];
}

export function NewClientPlanPageClient({
  clientId,
  templates,
}: {
  clientId: string;
  templates: Template[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"scratch" | "template">("scratch");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Il nome è obbligatorio.");
      return;
    }
    setLoading(true);
    try {
      const result = await createPlanForClient({
        clientId,
        name: trimmedName,
        mode,
        templateId: mode === "template" ? templateId : undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }
      router.push(`/plans/${result.planId}/edit`);
    } finally {
      setLoading(false);
    }
  }

  // Quando si seleziona un template, precompila il nome
  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t && !name.trim()) setName(t.name);
  }

  return (
    <div className="p-4 md:p-6 max-w-lg flex flex-col gap-6">
      <Link
        href={`/clients/${clientId}`}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Torna al cliente
      </Link>

      <h1 className="text-xl font-semibold text-[var(--color-text)]">Nuova Scheda</h1>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["scratch", "template"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={[
              "flex-1 py-3 px-4 rounded-[var(--radius-md)] border text-sm font-medium transition-colors",
              mode === m
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]",
            ].join(" ")}
          >
            {m === "scratch" ? "Crea da zero" : "Parti da template"}
          </button>
        ))}
      </div>

      {/* Template selector */}
      {mode === "template" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Template</label>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              Nessun template disponibile.{" "}
              <Link href="/templates/new" className="text-[var(--color-accent)] underline">
                Crea un template
              </Link>
            </p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan_days.length} giornate)
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <Input
        label="Nome scheda *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Es. Scheda Massa Fase 1..."
      />

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button fullWidth loading={loading} onClick={handleSubmit}>
        Crea scheda
      </Button>
    </div>
  );
}
```

```typescript
// src/app/(trainer)/clients/[id]/plans/new/page.tsx  ← server component
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { notFound } from "next/navigation";
import { NewClientPlanPageClient } from "./NewClientPlanPage";

interface Props {
  params: { id: string };
}

export default async function NewClientPlanPage({ params }: Props) {
  const { supabase, profile } = await getTrainerContext();

  // Verifica relazione trainer-cliente
  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", profile.id)
    .eq("client_id", params.id)
    .eq("is_active", true)
    .single();

  if (!relation) notFound();

  // Carica template del trainer
  const { data: templates } = await supabase
    .from("workout_plans")
    .select("id, name, description, plan_days(id)")
    .eq("trainer_id", profile.id)
    .is("client_id", null)
    .order("updated_at", { ascending: false });

  return (
    <NewClientPlanPageClient
      clientId={params.id}
      templates={(templates ?? []) as Array<{
        id: string;
        name: string;
        description: string | null;
        plan_days: { id: string }[];
      }>}
    />
  );
}
```

- [ ] **Step 2: Crea la server action**

```typescript
// src/app/(trainer)/clients/[id]/plans/new/actions.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clonePlan } from "@/lib/actions/plans";

interface CreatePlanInput {
  clientId: string;
  name: string;
  mode: "scratch" | "template";
  templateId?: string;
}

export async function createPlanForClient(
  input: CreatePlanInput
): Promise<{ success: true; planId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, gym_id")
      .eq("id", user.id)
      .single();
    if (!profile) return { success: false, error: "Profilo non trovato." };

    if (input.mode === "template" && input.templateId) {
      // Clona dal template
      return await clonePlan(input.templateId, {
        clientId: input.clientId,
        name: input.name,
      });
    }

    // Crea da zero
    const { data: newPlan, error } = await admin
      .from("workout_plans")
      .insert({
        gym_id: profile.gym_id,
        trainer_id: profile.id,
        client_id: input.clientId,
        name: input.name,
        status: "draft",
        version: 1,
      })
      .select("id")
      .single();

    if (error || !newPlan) return { success: false, error: "Errore nella creazione." };
    return { success: true, planId: newPlan.id };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(trainer\)/clients/\[id\]/plans/
git commit -m "feat: new client plan page with template selection"
```

---

## Task 10: Bottone "Salva come Template" nell'Editor Scheda

**Files:**
- Modify: `src/components/workout/PlanBuilder.tsx`
- Create: `src/app/(trainer)/plans/saveAsTemplate/actions.ts`

- [ ] **Step 1: Crea la server action**

```typescript
// src/app/(trainer)/plans/saveAsTemplate/actions.ts
"use server";

import { clonePlan } from "@/lib/actions/plans";

export async function saveAsTemplate(
  planId: string
): Promise<{ success: true; templateId: string } | { success: false; error: string }> {
  const result = await clonePlan(planId, { clientId: null });
  if (!result.success) return result;
  return { success: true, templateId: result.planId };
}
```

- [ ] **Step 2: Aggiungi il bottone in PlanBuilder (Step 4 - Review)**

Nel render dello Step 3 (Review/ultimo step) di `PlanBuilder.tsx`, aggiungi dopo il bottone principale un bottone secondario "Salva come template" visibile solo quando `!isTemplate` e `plan.id` esiste (cioè siamo in edit mode, non creazione):

```tsx
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
```

- [ ] **Step 3: Aggiungi la logica in PlanBuilder**

Importa `saveAsTemplate`:
```typescript
import { saveAsTemplate } from "@/app/(trainer)/plans/saveAsTemplate/actions";
```

Aggiungi stato per il feedback:
```typescript
const [templateSaved, setTemplateSaved] = useState(false);
```

Aggiungi la funzione handler nel componente:
```typescript
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
```

Mostra il feedback nel UI (vicino al bottone):
```tsx
{templateSaved && (
  <p className="text-sm text-[var(--color-success)] text-center">
    ✓ Template salvato —{" "}
    <a href="/templates" className="underline">Vedi template</a>
  </p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/workout/PlanBuilder.tsx src/app/\(trainer\)/plans/saveAsTemplate/
git commit -m "feat: save as template button in plan editor"
```

---

## Task 11: Verifica Finale

- [ ] **Step 1: Verifica che il dev server compili senza errori**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Atteso: nessun errore TypeScript.

- [ ] **Step 2: Test manuale — flusso template**
1. Login come trainer
2. Nav → Template → "Nuovo template"
3. Crea template con nome "Test Template"
4. Aggiungi una giornata e un esercizio nell'editor
5. Salva il template
6. Nav → Template → verifica che appaia in lista

- [ ] **Step 3: Test manuale — assegna da template**
1. Nav → Clienti → seleziona un cliente
2. Click "Nuova Scheda"
3. Seleziona "Parti da template"
4. Scegli "Test Template" dal dropdown
5. Clicca "Crea scheda"
6. Verifica che l'editor apra con le giornate del template pre-popolate

- [ ] **Step 4: Test manuale — salva come template**
1. Apri una scheda assegnata ad un cliente in edit mode
2. Arriva al tab Review
3. Click "Salva come template"
4. Verifica il feedback "Template salvato"
5. Nav → Template → verifica che appaia il template clonato

- [ ] **Step 5: Test manuale — obiettivi cliente**
1. Nav → Clienti → seleziona un cliente
2. Click "Modifica" nel box Obiettivi
3. Inserisci testo e clicca Salva
4. Verifica che il testo venga aggiornato senza refresh

- [ ] **Step 6: Commit finale**

```bash
git add -A
git commit -m "feat: complete template system and client view enhancements"
```
