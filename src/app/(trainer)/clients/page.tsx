import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { Users } from "lucide-react";
import Link from "next/link";

type ProfileRow  = Database["public"]["Tables"]["profiles"]["Row"];
type PlanStatus  = Database["public"]["Tables"]["workout_plans"]["Row"]["status"];

type ClientJoin = { client_id: string; is_active: boolean; profiles: ProfileRow };

export default async function TrainerClientsPage() {
  const { supabase, profile } = await getTrainerContext();

  const { data: raw } = await supabase
    .from("trainer_clients")
    .select("client_id, is_active, profiles!trainer_clients_client_id_fkey(*)")
    .eq("trainer_id", profile.id)
    .eq("is_active", true);

  const rows = (raw ?? []) as unknown as ClientJoin[];

  if (rows.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-xl font-semibold text-[var(--color-text)] mb-6">Clienti</h1>
        <EmptyState
          icon={Users}
          title="Nessun cliente ancora"
          description="Invita un cliente tramite link per iniziare."
        />
      </div>
    );
  }

  const clientIds = rows.map((r) => r.client_id);
  const { data: rawPlans } = await supabase
    .from("workout_plans")
    .select("id, client_id, name, status")
    .in("client_id", clientIds)
    .eq("trainer_id", profile.id)
    .in("status", ["active", "draft"]);

  const planByClient = Object.fromEntries(
    (rawPlans ?? []).map((p) => [p.client_id as string, p])
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Clienti
        <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
          ({rows.length})
        </span>
      </h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const client = row.profiles;
          if (!client) return null;
          const activePlan = planByClient[row.client_id];

          return (
            <Link key={row.client_id} href={`/clients/${row.client_id}`}>
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
                      {activePlan.name as string}
                    </span>
                    <Badge variant={activePlan.status as PlanStatus} />
                  </div>
                ) : (
                  <span className="text-xs text-[var(--color-text-secondary)] italic">
                    Nessuna scheda assegnata
                  </span>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
