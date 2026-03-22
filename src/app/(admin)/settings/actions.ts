"use server";

import { createClient } from "@/lib/supabase/server";

interface GymSettingsData {
  name: string;
  slug: string;
  primary_color: string;
  booking_cancellation_hours: number;
}

export async function updateGymSettings(
  gymId: string,
  data: GymSettingsData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin" || profile.gym_id !== gymId) {
      return { success: false, error: "Non autorizzato." };
    }

    const { error } = await supabase
      .from("gym")
      .update({
        name: data.name.trim(),
        slug: data.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        primary_color: data.primary_color,
        booking_cancellation_hours: data.booking_cancellation_hours,
      })
      .eq("id", gymId);

    if (error) return { success: false, error: "Errore nel salvataggio." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
