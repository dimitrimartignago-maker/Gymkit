import { getAdminContext } from "@/lib/supabase/get-admin-context";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Calendar, User } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await getAdminContext();

  const [clientRes, trainerRelRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, phone, is_active, created_at, role")
      .eq("id", params.id)
      .eq("gym_id", profile.gym_id)
      .eq("role", "client")
      .single(),
    supabase
      .from("trainer_clients")
      .select("trainer_id, profiles!trainer_clients_trainer_id_fkey(first_name, last_name)")
      .eq("client_id", params.id)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (clientRes.error || !clientRes.data) notFound();

  const client = clientRes.data;
  const trainerRel = trainerRelRes.data as {
    trainer_id: string;
    profiles: { first_name: string; last_name: string } | null;
  } | null;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/members"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-semibold shrink-0">
            {client.first_name?.[0]}
            {client.last_name?.[0]}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">
              {client.first_name} {client.last_name}
            </h1>
            <span
              className={[
                "text-xs font-medium px-2 py-0.5 rounded-full",
                client.is_active
                  ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                  : "bg-[var(--color-error)]/20 text-[var(--color-error)]",
              ].join(" ")}
            >
              {client.is_active ? "Attivo" : "Inattivo"}
            </span>
          </div>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] divide-y divide-[var(--color-border-soft)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <Mail size={15} className="text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-sm text-[var(--color-text)]">{client.email}</span>
        </div>
        {client.phone && (
          <div className="flex items-center gap-3 px-4 py-3">
            <Phone size={15} className="text-[var(--color-text-secondary)] shrink-0" />
            <span className="text-sm text-[var(--color-text)]">{client.phone}</span>
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3">
          <User size={15} className="text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-sm text-[var(--color-text)]">
            Trainer:{" "}
            {trainerRel?.profiles
              ? `${trainerRel.profiles.first_name} ${trainerRel.profiles.last_name}`
              : <span className="italic text-[var(--color-text-secondary)]">Non assegnato</span>}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <Calendar size={15} className="text-[var(--color-text-secondary)] shrink-0" />
          <span className="text-sm text-[var(--color-text)]">
            Iscritto il {formatDate(client.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}
