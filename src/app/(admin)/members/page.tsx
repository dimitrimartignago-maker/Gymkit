import { getAdminContext } from "@/lib/supabase/get-admin-context";
import { MembersClient } from "./MembersClient";

export default async function AdminMembersPage() {
  const { supabase, profile } = await getAdminContext();

  const [clientsRes, trainersRes, assignmentsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, is_active, created_at")
      .eq("gym_id", profile.gym_id)
      .eq("role", "client")
      .order("first_name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true)
      .order("first_name"),
    supabase
      .from("trainer_clients")
      .select("client_id, trainer_id")
      .eq("is_active", true),
  ]);

  // Mappa client_id -> trainer_id
  const trainerByClient: Record<string, string> = {};
  for (const row of assignmentsRes.data ?? []) {
    trainerByClient[row.client_id] = row.trainer_id;
  }

  return (
    <MembersClient
      clients={clientsRes.data ?? []}
      trainers={trainersRes.data ?? []}
      trainerByClient={trainerByClient}
    />
  );
}
