import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { getClientContext } from "@/lib/supabase/get-client-context";
import type { Database } from "@/lib/supabase/types";
import { ChevronRight, Dumbbell, Play } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

type PlanRow    = Database["public"]["Tables"]["workout_plans"]["Row"];
type PlanDayRow = Database["public"]["Tables"]["plan_days"]["Row"];
type PlanExRow  = Database["public"]["Tables"]["plan_exercises"]["Row"];

type PlanExWithEx = PlanExRow & {
  exercises: { id: string; name: string; muscle_group: string } | null;
};
type PlanDayWithEx = PlanDayRow & { plan_exercises: PlanExWithEx[] };
type PlanWithDays  = PlanRow & { plan_days: PlanDayWithEx[] };

function formatRest(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem > 0 ? `${m}min ${rem}s` : `${m}min`;
}

async function WorkoutContent() {
  const { supabase, profile } = await getClientContext();

  const { data: rawPlans } = await supabase
    .from("workout_plans")
    .select(`*, plan_days(*, plan_exercises(*, exercises(id, name, muscle_group)))`)
    .eq("client_id", profile.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  const plan = ((rawPlans ?? [])[0] ?? null) as unknown as PlanWithDays | null;

  if (!plan) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Nessuna scheda attiva"
        description="Il tuo trainer non ha ancora assegnato una scheda attiva."
      />
    );
  }

  const sortedDays = [...(plan.plan_days ?? [])].sort(
    (a, b) => a.day_order - b.day_order
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold text-[var(--color-text)]">{plan.name}</h2>
        {plan.description && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {plan.description}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {sortedDays.map((day) => {
          const exercises = [...(day.plan_exercises ?? [])].sort(
            (a, b) => a.exercise_order - b.exercise_order
          );

          return (
            <Card key={day.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-[var(--color-text)]">
                  {day.name}
                </h3>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {exercises.length} esercizi
                </span>
              </div>

              <ul className="flex flex-col gap-2.5">
                {exercises.map((pe) => (
                  <li key={pe.id} className="text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-[var(--color-text)]">
                        {pe.exercises?.name ?? "—"}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {pe.sets} × {pe.reps}
                        {pe.load_prescription ? ` · ${pe.load_prescription}` : ""}
                        {pe.rest_seconds ? ` · Rest ${formatRest(pe.rest_seconds)}` : ""}
                      </span>
                      {pe.notes && (
                        <span className="text-xs text-[var(--color-text-secondary)] italic">
                          {pe.notes}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              <Link
                href={`/workout/${day.id}/log`}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white font-semibold text-sm hover:opacity-90 active:opacity-80 transition-opacity"
              >
                <Play size={16} fill="currentColor" />
                Inizia Allenamento
                <ChevronRight size={16} />
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function WorkoutSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      {[0, 1].map((i) => (
        <Card key={i} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <SkeletonText lines={3} />
          <Skeleton className="h-12 w-full rounded-[var(--radius-md)]" />
        </Card>
      ))}
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        La mia Scheda
      </h1>
      <Suspense fallback={<WorkoutSkeleton />}>
        <WorkoutContent />
      </Suspense>
    </div>
  );
}
