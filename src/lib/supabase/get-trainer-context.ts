import { redirect } from "next/navigation";
import { createAdminClient } from "./admin";
import { createClient } from "./server";

export async function getTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id, role, first_name, last_name, can_manage_courses")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { supabase: admin, user, profile };
}
