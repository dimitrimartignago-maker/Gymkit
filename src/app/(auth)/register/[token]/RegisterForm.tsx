"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useState, useTransition } from "react";
import { registerWithToken } from "./actions";

const roleLabel: Record<string, string> = {
  client: "cliente",
  trainer: "trainer",
  admin: "amministratore",
};

interface Props {
  token: string;
  role: string;
  prefilledEmail?: string;
}

export function RegisterForm({ token, role, prefilledEmail }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    data.set("token", token);

    startTransition(async () => {
      const result = await registerWithToken(data);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Crea il tuo account</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Sei stato invitato come{" "}
          <span className="text-[var(--color-accent)] font-medium">
            {roleLabel[role] ?? role}
          </span>
          .
        </p>
      </div>

      <div className="flex gap-3">
        <Input
          label="Nome"
          name="firstName"
          type="text"
          autoComplete="given-name"
          placeholder="Mario"
          required
          disabled={isPending}
        />
        <Input
          label="Cognome"
          name="lastName"
          type="text"
          autoComplete="family-name"
          placeholder="Rossi"
          required
          disabled={isPending}
        />
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="mario@esempio.it"
        defaultValue={prefilledEmail}
        readOnly={!!prefilledEmail}
        required
        disabled={isPending}
        helperText={prefilledEmail ? "Email associata all'invito." : undefined}
      />

      <Input
        label="Telefono (opzionale)"
        name="phone"
        type="tel"
        autoComplete="tel"
        placeholder="+39 333 1234567"
        disabled={isPending}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Minimo 8 caratteri"
        required
        disabled={isPending}
        helperText="Almeno 8 caratteri."
        error={error ?? undefined}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isPending}
      >
        Crea account
      </Button>

      <p className="text-center text-xs text-[var(--color-text-secondary)]">
        Hai già un account?{" "}
        <a href="/login" className="text-[var(--color-accent)] underline">
          Accedi
        </a>
      </p>
    </form>
  );
}
