"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { roleHomeRoutes, type Role } from "@/config/permissions";

export async function signIn(
  formData: FormData
): Promise<{ error: string } | { redirect: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = formData.get("next") as string | null;

  if (!email || !password) {
    return { error: "Email e password sono obbligatori." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Credenziali non valide. Riprova." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role ?? "client") as Role;
  const destination =
    next && next.startsWith("/") ? next : roleHomeRoutes[role];

  return { redirect: destination };
}
