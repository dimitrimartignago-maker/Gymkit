"use server";

import { createClient } from "@/lib/supabase/server";

interface CourseFormData {
  name: string;
  description: string;
  color: string;
  max_capacity: number;
  default_duration_minutes: number;
  trainer_id: string | null;
  is_active: boolean;
}

async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, gym_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") throw new Error("Non autorizzato");
  return { supabase, profile };
}

export async function createCourse(
  data: CourseFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase.from("courses").insert({
      gym_id: profile.gym_id,
      name: data.name.trim(),
      description: data.description.trim() || null,
      color: data.color,
      max_capacity: data.max_capacity,
      default_duration_minutes: data.default_duration_minutes,
      trainer_id: data.trainer_id || null,
      is_active: data.is_active,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function updateCourse(
  id: string,
  data: CourseFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase
      .from("courses")
      .update({
        name: data.name.trim(),
        description: data.description.trim() || null,
        color: data.color,
        max_capacity: data.max_capacity,
        default_duration_minutes: data.default_duration_minutes,
        trainer_id: data.trainer_id || null,
        is_active: data.is_active,
      })
      .eq("id", id)
      .eq("gym_id", profile.gym_id);
    if (error) return { success: false, error: "Errore nell'aggiornamento." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function toggleCourseStatus(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase
      .from("courses")
      .update({ is_active: isActive })
      .eq("id", id)
      .eq("gym_id", profile.gym_id);
    if (error) return { success: false, error: "Errore." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
