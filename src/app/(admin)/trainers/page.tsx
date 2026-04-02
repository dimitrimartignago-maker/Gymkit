import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { TrainersClient } from "./TrainersClient";

type ProfileRow     = Database["public"]["Tables"]["profiles"]["Row"];
type InvitationRow  = Database["public"]["Tables"]["invitations"]["Row"];

export default async function AdminTrainersPage() {
  const { supabase, profile } = await getAdminContext();

  const [trainersRes, invitesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, is_active, can_manage_courses, created_at")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .order("first_name"),
    supabase
      .from("invitations")
      .select("id, token, role, email, pre_assigned_trainer, expires_at, created_at")
      .eq("gym_id", profile.gym_id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const trainers = (trainersRes.data ?? []) as Pick<
    ProfileRow,
    "id" | "first_name" | "last_name" | "email" | "is_active" | "can_manage_courses" | "created_at"
  >[];

  const invitations = (invitesRes.data ?? []) as Pick<
    InvitationRow,
    "id" | "token" | "role" | "email" | "pre_assigned_trainer" | "expires_at" | "created_at"
  >[];

  return (
    <TrainersClient
      trainers={trainers}
      invitations={invitations}
    />
  );
}
