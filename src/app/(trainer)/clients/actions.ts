"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

async function getTrainer() {
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
  if (!profile || profile.role !== "trainer") throw new Error("Non autorizzato");
  return { supabase: admin, profile };
}

export async function inviteClient(
  email: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { supabase, profile } = await getTrainer();
    const token = randomBytes(16).toString("hex");

    const { error } = await supabase.from("invitations").insert({
      gym_id: profile.gym_id,
      invited_by: profile.id,
      token,
      role: "client",
      email: email.trim() || null,
      pre_assigned_trainer: profile.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) return { success: false, error: "Errore nella creazione dell'invito." };
    revalidatePath("/clients");
    return { success: true, token };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function deleteInvitation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getTrainer();
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", id)
      .eq("gym_id", profile.gym_id);
    if (error) return { success: false, error: "Errore nell'eliminazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
