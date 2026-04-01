import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { notFound } from "next/navigation";
import { NewClientPlanPageClient } from "./NewClientPlanPage";

interface Props {
  params: { id: string };
}

export default async function NewClientPlanPage({ params }: Props) {
  const { supabase, profile } = await getTrainerContext();

  // Verifica relazione trainer-cliente
  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", profile.id)
    .eq("client_id", params.id)
    .eq("is_active", true)
    .single();

  if (!relation) notFound();

  // Carica template del trainer
  const { data: templates } = await supabase
    .from("workout_plans")
    .select("id, name, description, plan_days(id)")
    .eq("trainer_id", profile.id)
    .is("client_id", null)
    .order("updated_at", { ascending: false });

  return (
    <NewClientPlanPageClient
      clientId={params.id}
      templates={(templates ?? []) as Array<{
        id: string;
        name: string;
        description: string | null;
        plan_days: { id: string }[];
      }>}
    />
  );
}
