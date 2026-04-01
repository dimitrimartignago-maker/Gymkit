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
