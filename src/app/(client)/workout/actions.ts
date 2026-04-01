"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface SetLogData {
  plan_exercise_id: string;
  set_number: number;
  reps_done: number | null;
  load_used: number | null;
  rpe: number | null;
  notes: string;
}

interface SaveWorkoutLogInput {
  plan_id: string;
  plan_day_id: string;
  started_at: string;
  sets: SetLogData[];
  overall_rating: number | null;
  overall_notes: string;
}

export async function saveWorkoutLog(
  input: SaveWorkoutLogInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();
    const { data: log, error: logError } = await admin
      .from("workout_logs")
      .insert({
        client_id: user.id,
        plan_id: input.plan_id,
        plan_day_id: input.plan_day_id,
        started_at: input.started_at,
        completed_at: new Date().toISOString(),
        overall_notes: input.overall_notes.trim() || null,
        overall_rating: input.overall_rating,
      })
      .select("id")
      .single();

    if (logError || !log) {
      return { success: false, error: "Errore nel salvataggio del log." };
    }

    if (input.sets.length > 0) {
      const { error: setsError } = await admin
        .from("workout_log_sets")
        .insert(
          input.sets.map((s) => ({
            workout_log_id: log.id,
            plan_exercise_id: s.plan_exercise_id,
            set_number: s.set_number,
            reps_done: s.reps_done,
            load_used: s.load_used,
            load_unit: "kg",
            rpe: s.rpe,
            notes: s.notes.trim() || null,
          }))
        );

      if (setsError) {
        return { success: false, error: "Errore nel salvataggio dei set." };
      }
    }

    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
