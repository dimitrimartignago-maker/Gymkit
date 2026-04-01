// src/app/(trainer)/templates/new/page.tsx
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTemplatePage() {
  return (
    <div className="p-4 md:p-6 max-w-lg flex flex-col gap-6">
      <Link
        href="/templates"
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Template
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Nuovo Template</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Dopo la creazione potrai aggiungere giornate ed esercizi.
        </p>
      </div>

      <form action={createTemplate} className="flex flex-col gap-4">
        <Input
          label="Nome template *"
          name="name"
          placeholder="Es. Scheda Full Body 3x, Programma Massa..."
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">Descrizione</label>
          <textarea
            name="description"
            placeholder="Note sul template..."
            rows={3}
            className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
          />
        </div>
        <Button type="submit" fullWidth>
          Crea template
        </Button>
      </form>
    </div>
  );
}

async function createTemplate(formData: FormData) {
  "use server";
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createClient } = await import("@/lib/supabase/server");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string | null)?.trim() || null;

  const { data: newPlan } = await admin
    .from("workout_plans")
    .insert({
      gym_id: profile.gym_id,
      trainer_id: profile.id,
      client_id: null,
      name,
      description,
      status: "active",
      version: 1,
    })
    .select("id")
    .single();

  if (!newPlan) redirect("/templates");
  redirect(`/templates/${newPlan.id}/edit`);
}
