"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPlanForClient } from "./actions";

interface Template {
  id: string;
  name: string;
  description: string | null;
  plan_days: { id: string }[];
}

export function NewClientPlanPageClient({
  clientId,
  templates,
}: {
  clientId: string;
  templates: Template[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"scratch" | "template">("scratch");
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Il nome è obbligatorio.");
      return;
    }
    setLoading(true);
    try {
      const result = await createPlanForClient({
        clientId,
        name: trimmedName,
        mode,
        templateId: mode === "template" ? templateId : undefined,
      });
      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }
      router.push(`/plans/${result.planId}/edit`);
    } finally {
      setLoading(false);
    }
  }

  // Quando si seleziona un template, precompila il nome
  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const t = templates.find((t) => t.id === id);
    if (t && !name.trim()) setName(t.name);
  }

  return (
    <div className="p-4 md:p-6 max-w-lg flex flex-col gap-6">
      <Link
        href={`/clients/${clientId}`}
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Torna al cliente
      </Link>

      <h1 className="text-xl font-semibold text-[var(--color-text)]">Nuova Scheda</h1>

      {/* Mode selector */}
      <div className="flex gap-2">
        {(["scratch", "template"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={[
              "flex-1 py-3 px-4 rounded-[var(--radius-md)] border text-sm font-medium transition-colors",
              mode === m
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]",
            ].join(" ")}
          >
            {m === "scratch" ? "Crea da zero" : "Parti da template"}
          </button>
        ))}
      </div>

      {/* Template selector */}
      {mode === "template" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Template</label>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              Nessun template disponibile.{" "}
              <Link href="/templates/new" className="text-[var(--color-accent)] underline">
                Crea un template
              </Link>
            </p>
          ) : (
            <select
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan_days.length} giornate)
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <Input
        label="Nome scheda *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Es. Scheda Massa Fase 1..."
      />

      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button fullWidth loading={loading} onClick={handleSubmit}>
        Crea scheda
      </Button>
    </div>
  );
}
