import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GoalsEditor } from "./GoalsEditor";
import { WorkoutHistory } from "./WorkoutHistory";
import { getClientWorkoutHistory } from "./actions";
import type { WorkoutLogSummary } from "./actions";

type PlanStatus = Database["public"]["Tables"]["workout_plans"]["Row"]["status"];

interface Props {
  params: { id: string };
  searchParams: { tab?: string };
}

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { supabase, profile } = await getTrainerContext();
  const tab = searchParams.tab === "storico" ? "storico" : "profilo";

  const { data: relation } = await supabase
    .from("trainer_clients")
    .select("client_id")
    .eq("trainer_id", profile.id)
    .eq("client_id", params.id)
    .eq("is_active", true)
    .single();

  if (!relation) notFound();

  const clientRes = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, phone, avatar_url, goals, created_at")
    .eq("id", params.id)
    .single();

  if (!clientRes.data) notFound();
  const client = clientRes.data;

  // Load tab-specific data
  const [plansData, historyData] = await Promise.all([
    tab === "profilo"
      ? supabase
          .from("workout_plans")
          .select("id, name, status, version, starts_at, expires_at, updated_at")
          .eq("client_id", params.id)
          .eq("trainer_id", profile.id)
          .order("updated_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    tab === "storico"
      ? getClientWorkoutHistory(params.id)
      : Promise.resolve([]),
  ]);

  const plans = (plansData.data ?? []) as Database["public"]["Tables"]["workout_plans"]["Row"][];
  const activePlans   = plans.filter((p) => p.status === "active");
  const draftPlans    = plans.filter((p) => p.status === "draft");
  const archivedPlans = plans.filter((p) => p.status === "archived");

  const PlanCard = ({ plan }: { plan: (typeof plans)[number] }) => (
    <div className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)]">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text)] truncate">{plan.name}</span>
          <Badge variant={plan.status as PlanStatus} />
        </div>
        <div className="flex gap-3 text-xs text-[var(--color-text-secondary)]">
          <span>v{plan.version}</span>
          {plan.starts_at && (
            <span>{plan.starts_at}{plan.expires_at && ` → ${plan.expires_at}`}</span>
          )}
        </div>
      </div>
      <Link href={`/plans/${plan.id}/edit`}>
        <Button variant="ghost" size="sm">Modifica</Button>
      </Link>
    </div>
  );

  const tabClass = (active: boolean) =>
    [
      "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
      active
        ? "border-[var(--color-accent)] text-[var(--color-accent)]"
        : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
    ].join(" ");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <Link
        href="/clients"
        className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Tutti i clienti
      </Link>

      {/* Header */}
      <Card className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-bold text-lg shrink-0">
          {client.first_name?.[0]?.toUpperCase()}
          {client.last_name?.[0]?.toUpperCase()}
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold text-[var(--color-text)]">
            {client.first_name} {client.last_name}
          </h1>
          <span className="text-sm text-[var(--color-text-secondary)]">{client.email}</span>
          {client.phone && (
            <span className="text-sm text-[var(--color-text-secondary)]">{client.phone}</span>
          )}
        </div>
      </Card>

      {/* Tab nav */}
      <div className="flex border-b border-[var(--color-border)] -mb-3">
        <Link href={`/clients/${params.id}`} className={tabClass(tab === "profilo")}>
          Profilo
        </Link>
        <Link href={`/clients/${params.id}?tab=storico`} className={tabClass(tab === "storico")}>
          Storico
        </Link>
      </div>

      {/* Tab: Profilo */}
      {tab === "profilo" && (
        <>
          <GoalsEditor clientId={params.id} initialGoals={client.goals ?? ""} />

          <Link href={`/clients/${params.id}/plans/new`}>
            <Button variant="primary" size="md" fullWidth>
              <Plus size={16} /> Nuova Scheda
            </Button>
          </Link>

          {activePlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Schede attive ({activePlans.length})
              </h2>
              {activePlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {draftPlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text)]">
                Bozze ({draftPlans.length})
              </h2>
              {draftPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {archivedPlans.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-secondary)]">
                Archivio ({archivedPlans.length})
              </h2>
              {archivedPlans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </section>
          )}

          {plans.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">
              Nessuna scheda assegnata a questo cliente.
            </p>
          )}
        </>
      )}

      {/* Tab: Storico */}
      {tab === "storico" && (
        <WorkoutHistory logs={historyData as WorkoutLogSummary[]} />
      )}
    </div>
  );
}
