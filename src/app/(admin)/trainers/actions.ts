"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

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

interface InviteTrainerData {
  email: string;
}

interface InviteClientData {
  email: string;
  pre_assigned_trainer: string | null;
}

export async function inviteTrainer(
  data: InviteTrainerData
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const token = randomBytes(16).toString("hex");

    const { error } = await supabase.from("invitations").insert({
      gym_id: profile.gym_id,
      invited_by: profile.id,
      token,
      role: "trainer",
      email: data.email.trim() || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) return { success: false, error: "Errore nella creazione dell'invito." };
    revalidatePath("/trainers");
    return { success: true, token };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function inviteClient(
  data: InviteClientData
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const token = randomBytes(16).toString("hex");

    const { error } = await supabase.from("invitations").insert({
      gym_id: profile.gym_id,
      invited_by: profile.id,
      token,
      role: "client",
      email: data.email.trim() || null,
      pre_assigned_trainer: data.pre_assigned_trainer || null,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) return { success: false, error: "Errore nella creazione dell'invito." };
    revalidatePath("/trainers");
    return { success: true, token };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function deleteInvitation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase
      .from("invitations")
      .delete()
      .eq("id", id)
      .eq("gym_id", profile.gym_id);
    if (error) return { success: false, error: "Errore nell'eliminazione." };
    revalidatePath("/trainers");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function toggleTrainerStatus(
  trainerId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", trainerId)
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer");
    if (error) return { success: false, error: "Errore nell'aggiornamento." };
    revalidatePath("/trainers");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
