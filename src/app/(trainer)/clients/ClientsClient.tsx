"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Database } from "@/lib/supabase/types";
import { Check, Copy, Link, Mail, Trash2, UserPlus, Users } from "lucide-react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteInvitation, inviteClient } from "./actions";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type PlanStatus = Database["public"]["Tables"]["workout_plans"]["Row"]["status"];
type InvitationRow = Database["public"]["Tables"]["invitations"]["Row"];

type ClientJoin = { client_id: string; is_active: boolean; profiles: ProfileRow };

type Invitation = Pick<
  InvitationRow,
  "id" | "token" | "email" | "expires_at" | "created_at"
>;

interface Props {
  rows: ClientJoin[];
  planByClient: Record<string, { id: string; client_id: string | null; name: string; status: string }>;
  invitations: Invitation[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ClientsClient({ rows, planByClient, invitations: initialInvites }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [invitations, setInvitations] = useState(initialInvites);

  const [modal, setModal] = useState<"invite" | "link" | null>(null);
  const [email, setEmail] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleInvite() {
    setError("");
    startTransition(async () => {
      const result = await inviteClient(email);
      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }
      const link = `${window.location.origin}/register/${result.token}`;
      setGeneratedLink(link);
      setModal("link");
      router.refresh();
    });
  }

  function handleDeleteInvite(id: string) {
    startTransition(async () => {
      const result = await deleteInvitation(id);
      if (result.success) {
        setInvitations((prev) => prev.filter((i) => i.id !== id));
      }
    });
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Clienti
          {rows.length > 0 && (
            <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
              ({rows.length})
            </span>
          )}
        </h1>
        <Button size="sm" onClick={() => { setEmail(""); setError(""); setModal("invite"); }}>
          <UserPlus size={15} />
          Invita Cliente
        </Button>
      </div>

      {/* Client list */}
      {rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const client = row.profiles;
            if (!client) return null;
            const activePlan = planByClient[row.client_id];

            return (
              <NextLink key={row.client_id} href={`/clients/${row.client_id}`}>
                <Card className="flex flex-col gap-3 hover:bg-[var(--color-surface-raised)] transition-colors cursor-pointer h-full">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-semibold text-sm shrink-0">
                      {client.first_name?.[0]?.toUpperCase()}
                      {client.last_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-[var(--color-text)] truncate">
                        {client.first_name} {client.last_name}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)] truncate">
                        {client.email}
                      </span>
                    </div>
                  </div>
                  {activePlan ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-[var(--color-text-secondary)] truncate">
                        {activePlan.name}
                      </span>
                      <Badge variant={activePlan.status as PlanStatus} />
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--color-text-secondary)] italic">
                      Nessuna scheda assegnata
                    </span>
                  )}
                </Card>
              </NextLink>
            );
          })}
        </div>
      )}

      {rows.length === 0 && invitations.length === 0 && (
        <EmptyState
          icon={Users}
          title="Nessun cliente"
          description="Inizia invitando il tuo primo cliente per gestire le sue schede e i suoi progressi."
          ctaLabel="Invita Cliente"
          onCta={() => { setEmail(""); setError(""); setModal("invite"); }}
        />
      )}

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
            Inviti pendenti
          </h2>
          <div className="flex flex-col gap-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
              >
                <div className="flex-1 min-w-0">
                  {inv.email ? (
                    <span className="text-sm text-[var(--color-text)] truncate">{inv.email}</span>
                  ) : (
                    <span className="text-sm text-[var(--color-text-secondary)] italic">Link generico</span>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Scade {formatDate(inv.expires_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyLink(`${window.location.origin}/register/${inv.token}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] hover:bg-[var(--color-overlay-md)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-xs"
                  >
                    <Link size={13} />
                    Copia
                  </button>
                  <button
                    onClick={() => handleDeleteInvite(inv.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal: Invite */}
      <Modal open={modal === "invite"} onClose={() => setModal(null)} title="Invita Cliente">
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Genera un link di registrazione. Il cliente verrà assegnato automaticamente a te.
            L&apos;email è opzionale.
          </p>
          <Input
            label="Email (opzionale)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@esempio.it"
          />
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleInvite}>
            <Mail size={16} />
            Genera Link Invito
          </Button>
        </div>
      </Modal>

      {/* Modal: Link generato */}
      <Modal open={modal === "link"} onClose={() => setModal(null)} title="Link pronto">
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center shrink-0">
              <Check size={16} className="text-[var(--color-success)]" />
            </div>
            <p className="text-sm text-[var(--color-text)]">
              Invito creato. Copia il link e condividilo con il cliente.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 min-w-0 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] truncate font-mono">
              {generatedLink}
            </div>
            <button
              onClick={() => copyLink(generatedLink)}
              className={[
                "flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors shrink-0",
                copied
                  ? "bg-[var(--color-success)]/20 text-[var(--color-success)]"
                  : "bg-[var(--color-accent)] text-white hover:opacity-90",
              ].join(" ")}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copiato!" : "Copia"}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Il link scade tra 7 giorni.
          </p>
        </div>
      </Modal>
    </div>
  );
}
