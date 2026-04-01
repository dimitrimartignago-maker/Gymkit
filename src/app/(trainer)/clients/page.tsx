import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { ClientsClient } from "./ClientsClient";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

type ClientJoin = { client_id: string; is_active: boolean; profiles: ProfileRow };

export default async function TrainerClientsPage() {
  const { supabase, profile } = await getTrainerContext();

  const [clientsRes, invitesRes] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("client_id, is_active, profiles!trainer_clients_client_id_fkey(*)")
      .eq("trainer_id", profile.id)
      .eq("is_active", true),
    supabase
      .from("invitations")
      .select("id, token, email, expires_at, created_at")
      .eq("invited_by", profile.id)
      .eq("role", "client")
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const rows = (clientsRes.data ?? []) as unknown as ClientJoin[];

  const clientIds = rows.map((r) => r.client_id);
  const { data: rawPlans } = clientIds.length
    ? await supabase
        .from("workout_plans")
        .select("id, client_id, name, status")
        .in("client_id", clientIds)
        .eq("trainer_id", profile.id)
        .in("status", ["active", "draft"])
    : { data: [] };

  const planByClient = Object.fromEntries(
    (rawPlans ?? []).map((p) => [p.client_id as string, p])
  );

  const invitations = (invitesRes.data ?? []) as Pick<
    InvitationRow,
    "id" | "token" | "email" | "expires_at" | "created_at"
  >[];

  return (
    <ClientsClient
      rows={rows}
      planByClient={planByClient}
      invitations={invitations}
    />
  );
}
