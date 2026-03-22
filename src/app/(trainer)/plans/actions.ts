"use server";

import { createClient } from "@/lib/supabase/server";
import type { DayDraft, PlanDraft } from "@/components/workout/PlanBuilder";

type SaveResult = { success: true; planId: string } | { success: false; error: string };

async function getTrainer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, gym_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");
  return { supabase, profile };
}

async function upsertDays(
  supabase: Awaited<ReturnType<typeof getTrainer>>["supabase"],
  planId: string,
  days: DayDraft[]
) {
  // Delete existing days (cascade deletes plan_exercises)
  await supabase.from("plan_days").delete().eq("plan_id", planId);

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const { data: savedDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({ plan_id: planId, name: day.name, day_order: i })
      .select("id")
      .single();

    if (dayError || !savedDay) throw new Error("Errore nel salvataggio giornata.");

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j];
      const { error: exError } = await supabase.from("plan_exercises").insert({
        plan_day_id: savedDay.id,
        exercise_id: ex.exerciseId,
        exercise_order: j,
        sets: ex.sets,
        reps: ex.reps,
        rest_seconds: ex.restSeconds > 0 ? ex.restSeconds : null,
        load_prescription: ex.loadPrescription.trim() || null,
        notes: ex.notes.trim() || null,
        superset_group: ex.supersetGroup.trim() || null,
      });
      if (exError) throw new Error("Errore nel salvataggio esercizio.");
    }
  }
}

export async function savePlan(
  plan: PlanDraft,
  status: "draft" | "active"
): Promise<SaveResult> {
  try {
    const { supabase, profile } = await getTrainer();

    if (plan.id) {
      // ---- UPDATE ----
      const { data: existing } = await supabase
        .from("workout_plans")
        .select("version")
        .eq("id", plan.id)
        .single();

      const { error: updateError } = await supabase
        .from("workout_plans")
        .update({
          name: plan.name.trim(),
          description: plan.description.trim() || null,
          status,
          starts_at: plan.startsAt || null,
          expires_at: plan.expiresAt || null,
          version: (existing?.version ?? 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id)
        .eq("trainer_id", profile.id);

      if (updateError) return { success: false, error: "Errore nell'aggiornamento." };

      await upsertDays(supabase, plan.id, plan.days);
      return { success: true, planId: plan.id };
    } else {
      // ---- CREATE ----
      const { data: newPlan, error: planError } = await supabase
        .from("workout_plans")
        .insert({
          gym_id: profile.gym_id,
          client_id: plan.clientId,
          trainer_id: profile.id,
          name: plan.name.trim(),
          description: plan.description.trim() || null,
          status,
          starts_at: plan.startsAt || null,
          expires_at: plan.expiresAt || null,
        })
        .select("id")
        .single();

      if (planError || !newPlan) return { success: false, error: "Errore nella creazione." };

      await upsertDays(supabase, newPlan.id, plan.days);
      return { success: true, planId: newPlan.id };
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Errore imprevisto." };
  }
}
