import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { CoursesClient } from "./CoursesClient";

type CourseRow   = Database["public"]["Tables"]["courses"]["Row"];
type ProfileRow  = Database["public"]["Tables"]["profiles"]["Row"];

type TrainerProfile = Pick<ProfileRow, "id" | "first_name" | "last_name">;

export default async function AdminCoursesPage() {
  const { supabase, profile } = await getAdminContext();

  const [coursesRes, trainersRes] = await Promise.all([
    supabase
      .from("courses")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true)
      .order("first_name"),
  ]);

  const courses = (coursesRes.data ?? []) as CourseRow[];
  const trainers = (trainersRes.data ?? []) as TrainerProfile[];

  return <CoursesClient courses={courses} trainers={trainers} />;
}
