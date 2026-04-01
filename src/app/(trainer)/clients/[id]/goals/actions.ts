"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateClientGoals(
  clientId: string,
  goals: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();

    // Verifica che il caller sia il trainer del cliente
    const { data: relation } = await admin
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", user.id)
      .eq("client_id", clientId)
      .eq("is_active", true)
      .single();

    if (!relation) return { success: false, error: "Non autorizzato." };

    const { error } = await admin
      .from("profiles")
      .update({ goals: goals.trim() || null })
      .eq("id", clientId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/clients/${clientId}`);
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
