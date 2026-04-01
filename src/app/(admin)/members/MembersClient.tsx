"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy, Mail, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { inviteClient } from "../trainers/actions";
import { reassignClient } from "./actions";

type Client = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

type Trainer = {
  id: string;
  first_name: string;
  last_name: string;
};

interface Props {
  clients: Client[];
  trainers: Trainer[];
  trainerByClient: Record<string, string>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MembersClient({ clients, trainers, trainerByClient: initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trainerByClient, setTrainerByClient] = useState(initial);
  useEffect(() => { setTrainerByClient(initial); }, [initial]);

  // Invite modal
  const [modal, setModal] = useState<"invite" | "link" | null>(null);
  const [email, setEmail] = useState("");
  const [inviteTrainerId, setInviteTrainerId] = useState(trainers[0]?.id ?? "");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteError, setInviteError] = useState("");

  // Reassign state: clientId -> pending select value
  const [reassigning, setReassigning] = useState<string | null>(null);
  const [reassignError, setReassignError] = useState("");

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleInvite() {
    setInviteError("");
    startTransition(async () => {
      const result = await inviteClient({
        email,
        pre_assigned_trainer: inviteTrainerId || null,
      });
      if (!result.success) {
        setInviteError(result.error ?? "Errore.");
        return;
      }
      const link = `${window.location.origin}/register/${result.token}`;
      setGeneratedLink(link);
      setModal("link");
      router.refresh();
    });
  }

  function handleReassign(clientId: string, newTrainerId: string) {
    setReassignError("");
    startTransition(async () => {
      const result = await reassignClient(clientId, newTrainerId || null);
      if (!result.success) {
        setReassignError(result.error ?? "Errore.");
        return;
      }
      setTrainerByClient((prev) => {
        const next = { ...prev };
        if (newTrainerId) next[clientId] = newTrainerId;
        else delete next[clientId];
        return next;
      });
      setReassigning(null);
    });
  }

  const trainerMap = Object.fromEntries(trainers.map((t) => [t.id, t]));

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Clienti</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {clients.length} clienti registrati
          </p>
        </div>
        <Button size="sm" onClick={() => { setEmail(""); setInviteError(""); setModal("invite"); }}>
          <UserPlus size={15} />
          Invita Cliente
        </Button>
      </div>

      {reassignError && (
        <p className="text-sm text-[var(--color-error)]">{reassignError}</p>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nessun cliente ancora"
          description="Usa il bottone Invita Cliente per aggiungere il primo cliente."
        />
      ) : (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">Trainer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden lg:table-cell">Iscritto</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const currentTrainerId = trainerByClient[c.id];
                const currentTrainer = currentTrainerId ? trainerMap[currentTrainerId] : null;
                const isReassigning = reassigning === c.id;

                return (
                  <tr
                    key={c.id}
                    className={[
                      "border-b border-[var(--color-border-soft)]",
                      i === clients.length - 1 ? "border-b-0" : "",
                      !c.is_active ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] text-xs font-semibold shrink-0">
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </div>
                        <span className="font-medium text-[var(--color-text)]">
                          {c.first_name} {c.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">
                      {c.email}
                    </td>
                    <td className="px-4 py-3">
                      {isReassigning ? (
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={currentTrainerId ?? ""}
                            onChange={(e) => handleReassign(c.id, e.target.value)}
                            disabled={isPending}
                            className="text-xs rounded-[var(--radius-sm)] px-2 py-1.5 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-accent)] outline-none transition-colors"
                            autoFocus
                          >
                            <option value="">— Nessuno —</option>
                            {trainers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.first_name} {t.last_name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setReassigning(null)}
                            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReassigning(c.id)}
                          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors group"
                        >
                          <span>
                            {currentTrainer
                              ? `${currentTrainer.first_name} ${currentTrainer.last_name}`
                              : <span className="italic">Nessuno</span>}
                          </span>
                          <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-accent)]">
                            modifica
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden lg:table-cell">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Invite */}
      <Modal open={modal === "invite"} onClose={() => setModal(null)} title="Invita Cliente">
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Genera un link di registrazione. L&apos;email è opzionale.
          </p>
          <Input
            label="Email (opzionale)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@esempio.it"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Assegna a trainer
            </label>
            <select
              value={inviteTrainerId}
              onChange={(e) => setInviteTrainerId(e.target.value)}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Nessuno —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
            {trainers.length === 0 && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Nessun trainer attivo. Aggiungi prima un trainer dalla pagina Team.
              </p>
            )}
          </div>
          {inviteError && <p className="text-sm text-[var(--color-error)]">{inviteError}</p>}
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
              Invito creato. Copia il link e condividilo.
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
          <p className="text-xs text-[var(--color-text-secondary)]">Il link scade tra 7 giorni.</p>
        </div>
      </Modal>
    </div>
  );
}
