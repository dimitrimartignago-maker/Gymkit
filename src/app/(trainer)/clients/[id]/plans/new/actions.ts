"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { clonePlan } from "@/lib/actions/plans";

interface CreatePlanInput {
  clientId: string;
  name: string;
  mode: "scratch" | "template";
  templateId?: string;
}

export async function createPlanForClient(
  input: CreatePlanInput
): Promise<{ success: true; planId: string } | { success: false; error: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id, gym_id")
      .eq("id", user.id)
      .single();
    if (!profile) return { success: false, error: "Profilo non trovato." };

    // Verifica che il trainer sia associato al cliente
    const { data: relation } = await admin
      .from("trainer_clients")
      .select("client_id")
      .eq("trainer_id", profile.id)
      .eq("client_id", input.clientId)
      .eq("is_active", true)
      .single();

    if (!relation) return { success: false, error: "Non autorizzato." };

    if (input.mode === "template" && input.templateId) {
      // Clona dal template
      return await clonePlan(input.templateId, {
        clientId: input.clientId,
        name: input.name,
      });
    }

    // Crea da zero
    const { data: newPlan, error } = await admin
      .from("workout_plans")
      .insert({
        gym_id: profile.gym_id,
        trainer_id: profile.id,
        client_id: input.clientId,
        name: input.name,
        status: "draft",
        version: 1,
      })
      .select("id")
      .single();

    if (error || !newPlan) return { success: false, error: "Errore nella creazione." };
    return { success: true, planId: newPlan.id };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
