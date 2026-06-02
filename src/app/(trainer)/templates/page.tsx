// src/app/(trainer)/templates/page.tsx
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/Button";
import { Plus, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

export default async function TemplatesPage() {
  const { profile } = await getTrainerContext();
  const admin = createAdminClient();

  const { data: templates } = await admin
    .from("workout_plans")
    .select(`
      id, name, description, status, created_at, updated_at,
      plan_days (id)
    `)
    .eq("trainer_id", profile.id)
    .is("client_id", null)
    .order("updated_at", { ascending: false });

  const list = (templates ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    status: string;
    created_at: string;
    updated_at: string;
    plan_days: { id: string }[];
  }>;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Template Schede</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {list.length} template salvati
          </p>
        </div>
        <Link href="/templates/new">
          <Button size="sm">
            <Plus size={16} />
            Nuovo template
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nessun template ancora"
          description="Crea un template per riutilizzarlo su più clienti."
          ctaLabel="Crea il primo template"
          ctaHref="/templates/new"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((t) => (
            <Link
              key={t.id}
              href={`/templates/${t.id}/edit`}
              className="flex items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-medium text-[var(--color-text)] truncate">{t.name}</span>
                {t.description && (
                  <span className="text-sm text-[var(--color-text-secondary)] truncate">
                    {t.description}
                  </span>
                )}
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {t.plan_days.length} giornate ·{" "}
                  {new Date(t.updated_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <FileText size={18} className="text-[var(--color-text-secondary)] shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
