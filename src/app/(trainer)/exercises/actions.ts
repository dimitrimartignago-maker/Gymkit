"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

interface ExerciseFormData {
  name: string;
  muscle_group: string;
  equipment: string;
  description: string;
}

type ActionResult =
  | { success: true; exercise: ExerciseRow }
  | { success: false; error: string };

async function getTrainer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");
  return { supabase: admin, profile };
}

export async function createExercise(data: ExerciseFormData): Promise<ActionResult> {
  try {
    const { supabase, profile } = await getTrainer();
    const { data: raw, error } = await supabase
      .from("exercises")
      .insert({
        gym_id: profile.gym_id,
        name: data.name.trim(),
        muscle_group: data.muscle_group,
        equipment: data.equipment || null,
        description: data.description.trim() || null,
        is_default: false,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error || !raw) return { success: false, error: "Errore nella creazione." };
    return { success: true, exercise: raw as ExerciseRow };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function updateExercise(
  id: string,
  data: ExerciseFormData
): Promise<ActionResult> {
  try {
    const { supabase, profile } = await getTrainer();
    const { data: raw, error } = await supabase
      .from("exercises")
      .update({
        name: data.name.trim(),
        muscle_group: data.muscle_group,
        equipment: data.equipment || null,
        description: data.description.trim() || null,
      })
      .eq("id", id)
      .eq("created_by", profile.id)
      .select()
      .single();

    if (error || !raw) return { success: false, error: "Errore nell'aggiornamento." };
    return { success: true, exercise: raw as ExerciseRow };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cloneExercise(originalId: string): Promise<ActionResult> {
  try {
    const { supabase, profile } = await getTrainer();

    const { data: rawOrig } = await supabase
      .from("exercises")
      .select("*")
      .eq("id", originalId)
      .single();

    if (!rawOrig) return { success: false, error: "Esercizio originale non trovato." };
    const original = rawOrig as ExerciseRow;

    const { data: rawClone, error } = await supabase
      .from("exercises")
      .insert({
        gym_id: profile.gym_id,
        name: original.name,
        muscle_group: original.muscle_group,
        equipment: original.equipment,
        description: original.description,
        cloned_from: original.id,
        is_default: false,
        created_by: profile.id,
      })
      .select()
      .single();

    if (error || !rawClone) return { success: false, error: "Errore nella duplicazione." };
    return { success: true, exercise: rawClone as ExerciseRow };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function deleteExercise(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getTrainer();
    const { error } = await supabase
      .from("exercises")
      .update({ is_active: false })
      .eq("id", id)
      .eq("created_by", profile.id);

    if (error) return { success: false, error: "Errore nell'eliminazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
