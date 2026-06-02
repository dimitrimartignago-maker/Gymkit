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

export async function softDeleteUser(targetUserId: string): Promise<{ success: boolean; error?: string }> {
  try {
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

    if (user.id === targetUserId) {
      return { success: false, error: "Non puoi cancellare il tuo stesso account." };
    }

    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.rpc as any)("admin_soft_delete_user", {
      target_id: targetUserId,
      admin_id: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/members");
    return { success: true };
  } catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Errore imprevisto durante la cancellazione.";
  return { success: false, error: message };
}
}

export async function reactivateUser(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const role =
      (user as { app_metadata?: { role?: string } }).app_metadata?.role ??
      (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role;
    if (role !== "admin") return { success: false, error: "Non autorizzato." };

    const admin = createAdminClient();

    const { data: adminProfile } = await admin
      .from("profiles")
      .select("gym_id")
      .eq("id", user.id)
      .single();

    const { error } = await admin
      .from("profiles")
      .update({ is_active: true })
      .eq("id", targetUserId)
      .eq("gym_id", adminProfile!.gym_id)
      .eq("role", "client");

    if (error) return { success: false, error: error.message };

    revalidatePath("/members");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
