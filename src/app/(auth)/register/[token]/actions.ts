"use server";

import { createClient } from "@/lib/supabase/server";
import { roleHomeRoutes, type Role } from "@/config/permissions";
import { redirect } from "next/navigation";

export async function registerWithToken(formData: FormData) {
  const token = formData.get("token") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const phone = (formData.get("phone") as string) || null;

  if (!token || !email || !password || !firstName || !lastName) {
    return { error: "Tutti i campi obbligatori devono essere compilati." };
  }

  if (password.length < 8) {
    return { error: "La password deve essere di almeno 8 caratteri." };
  }

  const supabase = await createClient();

  // 1. Verifica il token
  const { data: invitation, error: invError } = await supabase
    .from("invitations")
    .select("id, gym_id, role, pre_assigned_trainer, email, expires_at, used_at")
    .eq("token", token)
    .single();

  if (invError || !invitation) {
    return { error: "Link di invito non valido o scaduto." };
  }

  if (invitation.used_at) {
    return { error: "Questo link di invito è già stato utilizzato." };
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return { error: "Il link di invito è scaduto." };
  }

  // Se l'invito è per un'email specifica, verificala
  if (invitation.email && invitation.email !== email) {
    return { error: "Questa email non corrisponde all'invito." };
  }

  // 2. Crea l'utente in auth.users
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Non richiedere verifica email — l'invito funge da verifica
      emailRedirectTo: undefined,
      data: {
        first_name: firstName,
        last_name: lastName,
      },
    },
  });

  if (signUpError) {
    if (
      signUpError.message.includes("already registered") ||
      signUpError.message.includes("User already registered")
    ) {
      return { error: "Esiste già un account con questa email." };
    }
    return { error: `Errore durante la registrazione: ${signUpError.message}` };
  }

  // Supabase restituisce user: null (senza error) se l'email esiste già in auth.users
  if (!authData.user) {
    return { error: "Esiste già un account con questa email." };
  }

  // 3. Crea il profilo
  const { error: profileError } = await supabase.from("profiles").insert({
    id: authData.user.id,
    gym_id: invitation.gym_id,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    role: invitation.role as Role,
    invited_by: null, // verrà popolato dalla FK nell'invito
  });

  if (profileError) {
    // Rollback: elimina l'utente auth appena creato
    await supabase.auth.admin?.deleteUser(authData.user.id);
    return { error: "Errore nella creazione del profilo. Riprova." };
  }

  // 4. Se c'è un trainer pre-assegnato, crea la relazione trainer_clients
  if (invitation.pre_assigned_trainer && invitation.role === "client") {
    await supabase.from("trainer_clients").insert({
      trainer_id: invitation.pre_assigned_trainer,
      client_id: authData.user.id,
    });
  }

  // 5. Marca l'invito come usato
  await supabase
    .from("invitations")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invitation.id);

  redirect(roleHomeRoutes[invitation.role as Role]);
}
