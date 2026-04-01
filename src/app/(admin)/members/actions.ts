"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function reassignClient(
  clientId: string,
  newTrainerId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verifica autenticazione e ruolo con il client utente
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const role = (user as { app_metadata?: { role?: string } }).app_metadata?.role
      ?? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role;

    if (role !== "admin") {
      return { success: false, error: "Non autorizzato." };
    }

    // Usa admin client per le operazioni su trainer_clients (bypassa RLS)
    const admin = createAdminClient();

    // Disattiva tutti i trainer_clients attivi per questo cliente
    await admin
      .from("trainer_clients")
      .update({ is_active: false })
      .eq("client_id", clientId)
      .eq("is_active", true);

    // Se è stato selezionato un nuovo trainer, crea o riattiva la relazione
    if (newTrainerId) {
      const { error } = await admin.from("trainer_clients").upsert(
        { trainer_id: newTrainerId, client_id: clientId, is_active: true },
        { onConflict: "trainer_id,client_id" }
      );
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/members");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
