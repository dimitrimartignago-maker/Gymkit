// src/lib/actions/plans.ts
"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type WorkoutPlanRow = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanDayRow = Database["public"]["Tables"]["plan_days"]["Row"];
type PlanExerciseRow = Database["public"]["Tables"]["plan_exercises"]["Row"];
type SourcePlan = WorkoutPlanRow & {
  plan_days: (PlanDayRow & { plan_exercises: PlanExerciseRow[] })[];
};

export async function clonePlan(
  sourcePlanId: string,
  options: {
    clientId?: string | null;  // null ou assente → template
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
    const typedSource = source as unknown as SourcePlan;

    // Ownership check
    if (typedSource.trainer_id !== user.id) return { success: false, error: "Non autorizzato." };

    // 2. Crea nuovo workout_plan
    const isTemplate = options.clientId === undefined || options.clientId === null;
    const { data: newPlan, error: planErr } = await admin
      .from("workout_plans")
      .insert({
        gym_id: typedSource.gym_id,
        trainer_id: user.id,
        client_id: options.clientId ?? null,
        name: options.name ?? typedSource.name,
        description: typedSource.description,
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
    type SourceDay = typeof typedSource.plan_days[number];
    const sortedDays = [...(typedSource.plan_days ?? [])].sort(
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

      if (dayErr || !newDay) {
        await admin.from("workout_plans").delete().eq("id", newPlan.id);
        return { success: false, error: "Errore clonazione giornata." };
      }

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
        if (exErr) {
          await admin.from("workout_plans").delete().eq("id", newPlan.id);
          return { success: false, error: "Errore clonazione esercizi." };
        }
      }
    }

    return { success: true, planId: newPlan.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Errore imprevisto." };
  }
}
