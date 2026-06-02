import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { getClientContext } from "@/lib/supabase/get-client-context";
import { CheckSquare, Star } from "lucide-react";
import Link from "next/link";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return null;
  const mins = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000
  );
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

export default async function LogPage() {
  const { supabase, profile } = await getClientContext();

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("id, plan_day_id, started_at, completed_at, overall_rating, overall_notes, plan_days(name)")
    .eq("client_id", profile.id)
    .order("started_at", { ascending: false })
    .limit(50);

  type LogRow = {
    id: string;
    plan_day_id: string;
    started_at: string;
    completed_at: string | null;
    overall_rating: number | null;
    overall_notes: string | null;
    plan_days: { name: string } | null;
  };

  const rows = (logs ?? []) as unknown as LogRow[];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 pb-[calc(var(--bottom-bar-height)+1rem)]">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Storico Allenamenti
        {rows.length > 0 && (
          <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
            ({rows.length})
          </span>
        )}
      </h1>

      {rows.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nessun allenamento ancora"
          description="Il tuo storico apparirà qui dopo aver completato il primo allenamento."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((log) => {
            const duration = formatDuration(log.started_at, log.completed_at);
            return (
              <Link key={log.id} href={`/log/${log.id}`} className="block hover:opacity-80 transition-opacity">
                <Card className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm text-[var(--color-text)]">
                        {log.plan_days?.name ?? "Allenamento"}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {formatDate(log.started_at)}
                        {duration && ` · ${duration}`}
                      </span>
                    </div>
                    {log.overall_rating && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {Array.from({ length: log.overall_rating }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className="text-[var(--color-accent)] fill-[var(--color-accent)]"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  {log.overall_notes && (
                    <p className="text-xs text-[var(--color-text-secondary)] italic">
                      {log.overall_notes}
                    </p>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
