"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Check, Copy, Link, Mail, Plus, ToggleLeft, ToggleRight, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteInvitation,
  inviteClient,
  inviteTrainer,
  toggleTrainerStatus,
} from "./actions";

type Trainer = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
};

type Invitation = {
  id: string;
  token: string;
  role: string;
  email: string | null;
  pre_assigned_trainer: string | null;
  expires_at: string;
  created_at: string;
};

interface Props {
  trainers: Trainer[];
  invitations: Invitation[];
}

function getInviteLink(token: string) {
  return `${window.location.origin}/register/${token}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TrainersClient({ trainers: initial, invitations: initialInvites }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [trainers, setTrainers] = useState(initial);
  const [invitations, setInvitations] = useState(initialInvites);

  // Modal state
  type ModalType = "trainer" | "client" | "link";
  const [modal, setModal] = useState<ModalType | null>(null);
  const [generatedLink, setGeneratedLink] = useState("");
  const [generatedRole, setGeneratedRole] = useState<"trainer" | "client">("trainer");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [trainerEmail, setTrainerEmail] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [preAssignedTrainer, setPreAssignedTrainer] = useState("");

  const activeTrainers = trainers.filter((t) => t.is_active);

  function openTrainer() {
    setTrainerEmail("");
    setError("");
    setModal("trainer");
  }

  function openClient() {
    setClientEmail("");
    setPreAssignedTrainer(activeTrainers[0]?.id ?? "");
    setError("");
    setModal("client");
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleInviteTrainer() {
    setError("");
    startTransition(async () => {
      const result = await inviteTrainer({ email: trainerEmail });
      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }
      const link = `${window.location.origin}/register/${result.token}`;
      setGeneratedLink(link);
      setGeneratedRole("trainer");
      setModal("link");
      router.refresh();
    });
  }

  function handleInviteClient() {
    setError("");
    startTransition(async () => {
      const result = await inviteClient({
        email: clientEmail,
        pre_assigned_trainer: preAssignedTrainer || null,
      });
      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }
      const link = `${window.location.origin}/register/${result.token}`;
      setGeneratedLink(link);
      setGeneratedRole("client");
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

  function handleToggle(trainer: Trainer) {
    startTransition(async () => {
      const result = await toggleTrainerStatus(trainer.id, !trainer.is_active);
      if (result.success) {
        setTrainers((prev) =>
          prev.map((t) =>
            t.id === trainer.id ? { ...t, is_active: !trainer.is_active } : t
          )
        );
      }
    });
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Team & Inviti
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {trainers.length} trainer · {invitations.length} inviti pendenti
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={openClient}>
            <UserPlus size={15} />
            Invita Cliente
          </Button>
          <Button size="sm" onClick={openTrainer}>
            <Plus size={15} />
            Invita Trainer
          </Button>
        </div>
      </div>

      {/* Trainers list */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          Trainer
        </h2>

        {trainers.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] italic">
            Nessun trainer ancora. Usa il bottone &quot;Invita Trainer&quot; per aggiungerne uno.
          </p>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[var(--color-surface-raised)]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden md:table-cell">
                    Iscritto
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                    Stato
                  </th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((t, i) => (
                  <tr
                    key={t.id}
                    className={[
                      "border-b border-white/5 hover:bg-white/3 transition-colors",
                      i === trainers.length - 1 ? "border-b-0" : "",
                      !t.is_active ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] text-xs font-semibold shrink-0">
                          {t.first_name[0]}{t.last_name[0]}
                        </div>
                        <span className="font-medium text-[var(--color-text)]">
                          {t.first_name} {t.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">
                      {t.email}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden md:table-cell">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(t)}
                        disabled={isPending}
                        className="transition-opacity disabled:opacity-50"
                        title={t.is_active ? "Disattiva" : "Attiva"}
                      >
                        {t.is_active ? (
                          <ToggleRight size={22} className="text-[var(--color-accent)]" />
                        ) : (
                          <ToggleLeft size={22} className="text-[var(--color-text-secondary)]" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-white/10"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        inv.role === "trainer"
                          ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                          : "bg-[var(--color-success)]/20 text-[var(--color-success)]",
                      ].join(" ")}
                    >
                      {inv.role === "trainer" ? "Trainer" : "Cliente"}
                    </span>
                    {inv.email && (
                      <span className="text-sm text-[var(--color-text)] truncate">
                        {inv.email}
                      </span>
                    )}
                    {!inv.email && (
                      <span className="text-sm text-[var(--color-text-secondary)] italic truncate">
                        Link generico
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Scade {formatDate(inv.expires_at)}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => copyLink(getInviteLink(inv.token))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface)] hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-xs"
                    title="Copia link"
                  >
                    <Link size={13} />
                    Copia
                  </button>
                  <button
                    onClick={() => handleDeleteInvite(inv.id)}
                    disabled={isPending}
                    className="p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors disabled:opacity-40"
                    title="Elimina invito"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal: Invite Trainer */}
      <Modal
        open={modal === "trainer"}
        onClose={() => setModal(null)}
        title="Invita Trainer"
      >
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Verrà generato un link di registrazione da condividere. L&apos;email è opzionale — serve solo per pre-compilare il form.
          </p>
          <Input
            label="Email (opzionale)"
            type="email"
            value={trainerEmail}
            onChange={(e) => setTrainerEmail(e.target.value)}
            placeholder="trainer@esempio.it"
          />
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleInviteTrainer}>
            <Mail size={16} />
            Genera Link Invito
          </Button>
        </div>
      </Modal>

      {/* Modal: Invite Client */}
      <Modal
        open={modal === "client"}
        onClose={() => setModal(null)}
        title="Invita Cliente"
      >
        <div className="flex flex-col gap-5 pt-2">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Il cliente riceverà un link per registrarsi e verrà assegnato automaticamente al trainer selezionato.
          </p>
          <Input
            label="Email (opzionale)"
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="cliente@esempio.it"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Assegna a trainer
            </label>
            <select
              value={preAssignedTrainer}
              onChange={(e) => setPreAssignedTrainer(e.target.value)}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-white/10 focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Nessuno —</option>
              {activeTrainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
          <Button fullWidth loading={isPending} onClick={handleInviteClient}>
            <Mail size={16} />
            Genera Link Invito
          </Button>
        </div>
      </Modal>

      {/* Modal: Link generato */}
      <Modal
        open={modal === "link"}
        onClose={() => setModal(null)}
        title="Link pronto"
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center shrink-0">
              <Check size={16} className="text-[var(--color-success)]" />
            </div>
            <p className="text-sm text-[var(--color-text)]">
              Invito {generatedRole === "trainer" ? "trainer" : "cliente"} creato. Copia il link e condividilo.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 min-w-0 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-white/10 text-xs text-[var(--color-text-secondary)] truncate font-mono">
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
            Il link scade tra 7 giorni. Puoi vedere e gestire tutti gli inviti pendenti nella lista.
          </p>
        </div>
      </Modal>
    </div>
  );
}
