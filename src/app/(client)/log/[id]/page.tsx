import { getClientContext } from "@/lib/supabase/get-client-context";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

type LogSet = {
  id: string;
  plan_exercise_id: string;
  set_number: number;
  reps_done: number | null;
  load_used: number | null;
  load_unit: string | null;
  rpe: number | null;
  notes: string | null;
  plan_exercises: {
    exercise_order: number;
    exercises: { name: string } | null;
  } | null;
};

type WorkoutLog = {
  id: string;
  plan_day_id: string;
  started_at: string;
  completed_at: string | null;
  overall_rating: number | null;
  overall_notes: string | null;
  plan_days: { name: string } | null;
  workout_log_sets: LogSet[];
};

export default async function LogDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { supabase, profile } = await getClientContext();

  const { data: log, error } = await supabase
    .from("workout_logs")
    .select(`
      id, plan_day_id, started_at, completed_at, overall_rating, overall_notes,
      plan_days(name),
      workout_log_sets(
        id, plan_exercise_id, set_number, reps_done, load_used, load_unit, rpe, notes,
        plan_exercises(exercise_order, exercises(name))
      )
    `)
    .eq("id", params.id)
    .eq("client_id", profile.id)
    .single();

  if (error || !log) notFound();

  const typedLog = log as unknown as WorkoutLog;
  const duration = formatDuration(typedLog.started_at, typedLog.completed_at);

  // Raggruppa i set per esercizio (tramite plan_exercise_id)
  const exerciseMap = new Map<
    string,
    { name: string; order: number; sets: LogSet[] }
  >();
  for (const s of typedLog.workout_log_sets ?? []) {
    if (!exerciseMap.has(s.plan_exercise_id)) {
      exerciseMap.set(s.plan_exercise_id, {
        name: s.plan_exercises?.exercises?.name ?? "Esercizio",
        order: s.plan_exercises?.exercise_order ?? 0,
        sets: [],
      });
    }
    exerciseMap.get(s.plan_exercise_id)!.sets.push(s);
  }
  const exercises = Array.from(exerciseMap.values()).sort(
    (a, b) => a.order - b.order
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 pb-[calc(var(--bottom-bar-height)+1rem)]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/log"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            {typedLog.plan_days?.name ?? "Allenamento"}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {formatDate(typedLog.started_at)}
            {duration && ` · ${duration}`}
          </p>
        </div>
      </div>

      {/* Rating + Note */}
      {(typedLog.overall_rating || typedLog.overall_notes) && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] p-4 flex flex-col gap-2">
          {typedLog.overall_rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: typedLog.overall_rating }).map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className="text-[var(--color-accent)] fill-[var(--color-accent)]"
                />
              ))}
            </div>
          )}
          {typedLog.overall_notes && (
            <p className="text-sm text-[var(--color-text-secondary)] italic">
              {typedLog.overall_notes}
            </p>
          )}
        </div>
      )}

      {/* Esercizi */}
      {exercises.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)] italic">
          Nessun esercizio registrato.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)] overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)]">
                <span className="font-semibold text-sm text-[var(--color-text)]">
                  {ex.name}
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-soft)]">
                    <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                      Set
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                      Reps
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase">
                      Carico
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase hidden sm:table-cell">
                      RPE
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] uppercase hidden sm:table-cell">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ex.sets
                    .sort((a, b) => a.set_number - b.set_number)
                    .map((set) => (
                      <tr
                        key={set.id}
                        className="border-b border-[var(--color-border-soft)] last:border-0"
                      >
                        <td className="px-4 py-2 text-[var(--color-text-secondary)]">
                          {set.set_number}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-text)]">
                          {set.reps_done ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-text)]">
                          {set.load_used != null
                            ? `${set.load_used} ${set.load_unit ?? "kg"}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)] hidden sm:table-cell">
                          {set.rpe ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-[var(--color-text-secondary)] hidden sm:table-cell">
                          {set.notes ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
