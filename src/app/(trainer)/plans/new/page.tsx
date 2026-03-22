import { PlanBuilder } from "@/components/workout/PlanBuilder";
import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";

type ProfileRow  = Database["public"]["Tables"]["profiles"]["Row"];
type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

interface Props {
  searchParams: { clientId?: string };
}

export default async function NewPlanPage({ searchParams }: Props) {
  const { supabase, profile } = await getTrainerContext();

  const [clientsRes, exercisesRes] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("client_id, profiles!trainer_clients_client_id_fkey(*)")
      .eq("trainer_id", profile.id)
      .eq("is_active", true),
    supabase
      .from("exercises")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true),
  ]);

  // Join result typed manually
  type ClientJoin = { client_id: string; profiles: ProfileRow };
  const clientRows = (clientsRes.data ?? []) as unknown as ClientJoin[];
  const clients = clientRows.map((r) => r.profiles).filter(Boolean);

  const exercises = ((exercisesRes.data ?? []) as ExerciseRow[]).sort((a, b) => {
    const aOwn = a.created_by === profile.id ? 0 : 1;
    const bOwn = b.created_by === profile.id ? 0 : 1;
    return aOwn !== bOwn ? aOwn - bOwn : Number(a.is_default) - Number(b.is_default);
  });

  return (
    <>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-white/10 px-4 md:px-6 py-4">
        <h1 className="font-semibold text-[var(--color-text)]">Nuova Scheda</h1>
      </div>
      <PlanBuilder
        gymId={profile.gym_id}
        trainerId={profile.id}
        clients={clients}
        exercises={exercises}
        defaultClientId={searchParams.clientId}
      />
    </>
  );
}
