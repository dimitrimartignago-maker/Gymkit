import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./RegisterForm";

interface Props {
  params: { token: string };
}

async function getInvitation(token: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invitations")
    .select("id, role, email, expires_at, used_at, pre_assigned_trainer")
    .eq("token", token)
    .single();
  return data;
}

export default async function RegisterPage({ params }: Props) {
  const { token } = params;
  const invitation = await getInvitation(token);

  // Token non trovato
  if (!invitation) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)] text-center flex flex-col gap-3">
        <p className="text-2xl">🔗</p>
        <p className="font-semibold text-[var(--color-text)]">Link non valido</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Questo link di invito non esiste. Chiedi un nuovo invito alla tua palestra.
        </p>
      </div>
    );
  }

  // Token già usato
  if (invitation.used_at) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)] text-center flex flex-col gap-3">
        <p className="text-2xl">✅</p>
        <p className="font-semibold text-[var(--color-text)]">Link già utilizzato</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Questo invito è già stato usato. Se hai già un account,{" "}
          <a href="/login" className="text-[var(--color-accent)] underline">
            accedi qui
          </a>
          .
        </p>
      </div>
    );
  }

  // Token scaduto
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)] text-center flex flex-col gap-3">
        <p className="text-2xl">⏰</p>
        <p className="font-semibold text-[var(--color-text)]">Link scaduto</p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Questo link è scaduto. Chiedi un nuovo invito alla tua palestra.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)]">
      <RegisterForm
        token={token}
        role={invitation.role}
        prefilledEmail={invitation.email ?? undefined}
      />
    </div>
  );
}
