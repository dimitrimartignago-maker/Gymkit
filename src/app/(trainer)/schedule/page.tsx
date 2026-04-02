import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import type { Database } from "@/lib/supabase/types";
import { ScheduleClient, type SlotWithDetails } from "./ScheduleClient";

type CourseRow    = Database["public"]["Tables"]["courses"]["Row"];
type ScheduleRow  = Database["public"]["Tables"]["course_schedules"]["Row"];
type ProfileRow   = Database["public"]["Tables"]["profiles"]["Row"];

type SlotRaw = {
  id: string;
  course_id: string;
  trainer_id: string | null;
  starts_at: string;
  ends_at: string;
  max_capacity_override: number | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number; trainer_id: string | null } | null;
  bookings: { id: string; status: string }[];
};

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

interface Props {
  searchParams: { week?: string };
}

export default async function SchedulePage({ searchParams }: Props) {
  const weekStart = getWeekStart(searchParams.week);
  const weekEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  })();

  const { supabase, profile } = await getTrainerContext();

  const [slotsRes, coursesRes, schedulesRes, trainersRes] = await Promise.all([
    supabase
      .from("class_slots")
      .select(`id, course_id, trainer_id, starts_at, ends_at, max_capacity_override, is_cancelled, cancellation_reason, courses(id, name, color, max_capacity, trainer_id), bookings(id, status)`)
      .gte("starts_at", weekStart + "T00:00:00")
      .lt("starts_at", weekEnd + "T00:00:00")
      .order("starts_at"),
    supabase
      .from("courses")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("course_schedules")
      .select("*")
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true),
  ]);

  const rawSlots = (slotsRes.data ?? []) as unknown as SlotRaw[];
  const courses = (coursesRes.data ?? []) as CourseRow[];
  const schedules = (schedulesRes.data ?? []) as ScheduleRow[];
  const trainers = (trainersRes.data ?? []) as Pick<ProfileRow, "id" | "first_name" | "last_name">[];

  // Gym course ids set for filtering schedules
  const gymCourseIds = new Set(courses.map((c) => c.id));
  const gymSchedules = schedules.filter((s) => gymCourseIds.has(s.course_id));

  // Map trainer id → name
  const trainerMap = Object.fromEntries(
    trainers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])
  );

  const slots: SlotWithDetails[] = rawSlots.map((s) => {
    const confirmedCount = s.bookings.filter((b) => b.status === "confirmed").length;
    const waitlistCount = s.bookings.filter((b) => b.status === "waitlist").length;
    const capacity = s.max_capacity_override ?? s.courses?.max_capacity ?? 0;
    return {
      id: s.id,
      course_id: s.course_id,
      trainer_id: s.trainer_id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      is_cancelled: s.is_cancelled,
      cancellation_reason: s.cancellation_reason,
      capacity,
      confirmed_count: confirmedCount,
      waitlist_count: waitlistCount,
      course_name: s.courses?.name ?? "Corso",
      course_color: s.courses?.color ?? "#3b82f6",
      trainer_name: s.trainer_id ? (trainerMap[s.trainer_id] ?? null) : null,
    };
  });

  // Compute own slot IDs and own course IDs
  const ownSlotIds = new Set(
    slots
      .filter(
        (s) =>
          s.trainer_id === profile.id ||
          (s.trainer_id === null &&
            (rawSlots.find((r) => r.id === s.id)?.courses?.trainer_id ?? null) === profile.id)
      )
      .map((s) => s.id)
  );

  const ownCourseIds = new Set(
    courses
      .filter((c) => (c as { trainer_id: string | null }).trainer_id === profile.id)
      .map((c) => c.id)
  );

  const canManage = (profile as { can_manage_courses: boolean }).can_manage_courses ?? false;

  // Filter slots to only own ones when trainer cannot manage all
  const visibleSlots = canManage
    ? slots
    : slots.filter((s) => ownSlotIds.has(s.id));

  return (
    <ScheduleClient
      weekStart={weekStart}
      slots={visibleSlots}
      courses={courses}
      schedules={gymSchedules}
      trainers={trainers}
      trainerId={profile.id}
      canManage={canManage}
      ownSlotIds={Array.from(ownSlotIds)}
      ownCourseIds={Array.from(ownCourseIds)}
    />
  );
}
