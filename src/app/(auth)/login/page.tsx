"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, useTransition } from "react";
import { signIn } from "./actions";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const data = new FormData(e.currentTarget);
    if (next) data.set("next", next);

    startTransition(async () => {
      const result = await signIn(data);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Accedi</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Inserisci le tue credenziali per continuare.
        </p>
      </div>

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="nome@esempio.it"
        required
        disabled={isPending}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
        disabled={isPending}
        error={error ?? undefined}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={isPending}
      >
        Accedi
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-md)]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
