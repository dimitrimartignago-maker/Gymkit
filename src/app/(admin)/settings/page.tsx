import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { SettingsClient } from "./SettingsClient";

type GymRow = Database["public"]["Tables"]["gym"]["Row"];

export default async function AdminSettingsPage() {
  const { supabase, profile } = await getAdminContext();

  const { data: gymData } = await supabase
    .from("gym")
    .select("*")
    .eq("id", profile.gym_id)
    .single();

  const gym = gymData as GymRow | null;
  if (!gym) return <p className="p-6 text-[var(--color-text-secondary)]">Gym non trovata.</p>;

  return <SettingsClient gym={gym} />;
}
