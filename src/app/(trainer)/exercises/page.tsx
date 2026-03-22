import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { ExercisesClient } from "./ExercisesClient";

type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

export default async function ExercisesPage() {
  const { supabase, profile } = await getTrainerContext();

  const { data: raw } = await supabase
    .from("exercises")
    .select("*")
    .eq("gym_id", profile.gym_id)
    .eq("is_active", true);

  const exercises = (raw ?? []) as ExerciseRow[];

  const sorted = [...exercises].sort((a, b) => {
    const aOwn = a.created_by === profile.id ? 0 : 1;
    const bOwn = b.created_by === profile.id ? 0 : 1;
    if (aOwn !== bOwn) return aOwn - bOwn;
    return Number(a.is_default) - Number(b.is_default);
  });

  return <ExercisesClient exercises={sorted} trainerId={profile.id} />;
}
