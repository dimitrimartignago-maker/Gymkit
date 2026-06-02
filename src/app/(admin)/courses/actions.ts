"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") throw new Error("Non autorizzato");
  return { supabase: admin, profile };
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
    revalidatePath("/courses");
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
    revalidatePath("/courses");
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
    revalidatePath("/courses");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function deleteCourse(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { data: futureSlots } = await supabase
      .from("class_slots")
      .select("id")
      .eq("course_id", id)
      .gte("starts_at", new Date().toISOString())
      .eq("is_cancelled", false)
      .limit(1);
    if (futureSlots && futureSlots.length > 0) {
      return { success: false, error: "Ci sono slot futuri attivi. Cancellali prima di eliminare il corso." };
    }
    const { error } = await supabase
      .from("courses")
      .delete()
      .eq("id", id)
      .eq("gym_id", profile.gym_id);
    if (error) return { success: false, error: "Errore nell'eliminazione." };
    revalidatePath("/courses");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
