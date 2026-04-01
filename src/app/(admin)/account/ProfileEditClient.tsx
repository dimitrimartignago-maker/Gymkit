"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Check, Pencil, X } from "lucide-react";
import { useState, useTransition } from "react";
import { updateProfile } from "./actions";

interface Props {
  firstName: string;
  lastName: string;
  phone: string | null;
}

export function ProfileEditClient({ firstName, lastName, phone }: Props) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [tel, setTel] = useState(phone ?? "");

  function handleSave() {
    if (!first.trim() || !last.trim()) {
      setError("Nome e cognome sono obbligatori.");
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await updateProfile({ first_name: first, last_name: last, phone: tel });
      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        setSaved(true);
        setEditing(false);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  function handleCancel() {
    setFirst(firstName);
    setLast(lastName);
    setTel(phone ?? "");
    setError("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
      >
        <Pencil size={13} />
        {saved ? (
          <span className="text-[var(--color-success)] flex items-center gap-1">
            <Check size={13} /> Salvato
          </span>
        ) : (
          "Modifica profilo"
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Nome"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          disabled={isPending}
        />
        <Input
          label="Cognome"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          disabled={isPending}
        />
      </div>
      <Input
        label="Telefono"
        value={tel}
        onChange={(e) => setTel(e.target.value)}
        placeholder="+39 333 000 0000"
        disabled={isPending}
      />
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" loading={isPending} onClick={handleSave}>
          <Check size={14} /> Salva
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCancel} disabled={isPending}>
          <X size={14} /> Annulla
        </Button>
      </div>
    </div>
  );
}
