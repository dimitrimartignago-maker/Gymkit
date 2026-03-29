import { PlanBuilder, type DayDraft, type PlanDraft } from "@/components/workout/PlanBuilder";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { notFound } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

type ProfileRow     = Database["public"]["Tables"]["profiles"]["Row"];
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

export default async function EditPlanPage({ params }: Props) {
  const { supabase, profile } = await getTrainerContext();

  const [planRes, clientsRes, exercisesRes] = await Promise.all([
    supabase
      .from("workout_plans")
      .select(`*, plan_days(*, plan_exercises(*, exercises(id, name, muscle_group)))`)
      .eq("id", params.id)
      .eq("trainer_id", profile.id)
      .single(),
    supabase
      .from("trainer_clients")
      .select("client_id, profiles!trainer_clients_client_id_fkey(*)")
      .eq("trainer_id", profile.id)
      .eq("is_active", true),
    supabase
      .from("exercises")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true),
  ]);

  const rawPlan = (planRes.data ?? null) as unknown as PlanWithDays | null;
  if (!rawPlan) notFound();

  const sortedDays = [...(rawPlan.plan_days ?? [])].sort(
    (a, b) => a.day_order - b.day_order
  );

  const days: DayDraft[] = sortedDays.map((day) => ({
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
    clientId: rawPlan.client_id,
    name: rawPlan.name,
    description: rawPlan.description ?? "",
    startsAt: rawPlan.starts_at ?? "",
    expiresAt: rawPlan.expires_at ?? "",
    days,
  };

  type ClientJoin = { client_id: string; profiles: ProfileRow };
  const clientRows = (clientsRes.data ?? []) as unknown as ClientJoin[];
  const clients = clientRows.map((r) => r.profiles).filter(Boolean);

  const exercises = ((exercisesRes.data ?? []) as ExerciseRow[]).sort((a, b) => {
    const aOwn = a.created_by === profile.id ? 0 : 1;
    const bOwn = b.created_by === profile.id ? 0 : 1;
    return aOwn !== bOwn ? aOwn - bOwn : Number(a.is_default) - Number(b.is_default);
  });

  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 md:px-6 py-4">
        <h1 className="font-semibold text-[var(--color-text)]">
          Modifica Scheda
          <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
            v{rawPlan.version}
          </span>
        </h1>
      </div>
      <PlanBuilder
        gymId={profile.gym_id}
        trainerId={profile.id}
        clients={clients}
        exercises={exercises}
        initialPlan={initialPlan}
      />
    </>
  );
}
