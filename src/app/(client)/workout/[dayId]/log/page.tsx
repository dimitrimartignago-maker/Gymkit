import { getClientContext } from "@/lib/supabase/get-client-context";
import type { Database } from "@/lib/supabase/types";
import { notFound } from "next/navigation";
import { LogClient, type ExerciseData } from "./LogClient";

type PlanDayRow = Database["public"]["Tables"]["plan_days"]["Row"];
type PlanExRow  = Database["public"]["Tables"]["plan_exercises"]["Row"];

type PlanExWithEx = PlanExRow & {
  exercises: { id: string; name: string; muscle_group: string } | null;
};
type PlanDayWithEx = PlanDayRow & { plan_exercises: PlanExWithEx[] };

interface Props {
  params: { dayId: string };
}

export default async function WorkoutLogPage({ params }: Props) {
  const { supabase, profile } = await getClientContext();

  const { data: rawDay } = await supabase
    .from("plan_days")
    .select(`*, plan_exercises(*, exercises(id, name, muscle_group))`)
    .eq("id", params.dayId)
    .single();

  const day = (rawDay ?? null) as unknown as PlanDayWithEx | null;
  if (!day) notFound();

  // Verify client owns this plan
  const { data: plan } = await supabase
    .from("workout_plans")
    .select("id, name")
    .eq("id", day.plan_id)
    .eq("client_id", profile.id)
    .single();

  if (!plan) notFound();

  const sortedExercises = [...(day.plan_exercises ?? [])].sort(
    (a, b) => a.exercise_order - b.exercise_order
  );

  const exercises: ExerciseData[] = sortedExercises.map((pe) => ({
    planExerciseId: pe.id,
    name: pe.exercises?.name ?? "Esercizio",
    muscleGroup: pe.exercises?.muscle_group ?? "",
    sets: pe.sets,
    reps: pe.reps,
    restSeconds: pe.rest_seconds ?? 0,
    loadPrescription: pe.load_prescription ?? "",
    notes: pe.notes ?? "",
    supersetGroup: pe.superset_group ?? "",
  }));

  return (
    <LogClient
      planId={day.plan_id}
      day={{ id: day.id, name: day.name }}
      exercises={exercises}
    />
  );
}
