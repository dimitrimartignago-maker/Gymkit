import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function getTrainerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, gym_id, role, first_name, last_name")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return { supabase, user, profile };
}
