"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return [];

  const supabase = createAdminClient();

  // Verify caller is the trainer for this client
  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", user.id)
    .eq("client_id", clientId)
    .eq("is_active", true)
    .single();

  if (!relation) return [];

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

  if (error || !data) {
    if (error) console.error("[getClientWorkoutHistory]", error.message);
    return [];
  }

  return (data as unknown as RawLog[]).map((log) => {
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
