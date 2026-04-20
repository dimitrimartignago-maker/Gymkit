import { getAdminContext } from "@/lib/supabase/get-admin-context";
import type { Database } from "@/lib/supabase/types";
import { CalendarClient, type SlotWithDetails } from "./CalendarClient";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];

type SlotRaw = {
  id: string;
  course_id: string;
  starts_at: string;
  ends_at: string;
  max_capacity_override: number | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  recurrence_id: string | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number } | null;
  bookings: { id: string; status: string }[];
  class_slot_trainers: { trainer_id: string }[];
};

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

interface Props {
  searchParams: { week?: string; view?: string; date?: string };
}

export default async function AdminCalendarPage({ searchParams }: Props) {
  const view = searchParams.view === "day" ? "day" : "week";
  const weekStart = getWeekStart(searchParams.week);
  const viewDate = view === "day"
    ? (searchParams.date ?? new Date().toISOString().split("T")[0])
    : weekStart;

  // Date range for query
  const rangeStart = (view === "day" ? viewDate : weekStart) + "T00:00:00";
  const rangeEndDate = (() => {
    if (view === "day") {
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    }
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  })();

  const { supabase, profile } = await getAdminContext();

  const [slotsRes, coursesRes, trainersRes] = await Promise.all([
    supabase
      .from("class_slots")
      .select(`
        id, course_id, starts_at, ends_at, max_capacity_override,
        is_cancelled, cancellation_reason, recurrence_id,
        courses(id, name, color, max_capacity),
        bookings(id, status),
        class_slot_trainers(trainer_id)
      `)
      .gte("starts_at", rangeStart)
      .lt("starts_at", rangeEndDate + "T00:00:00")
      .order("starts_at"),
    supabase
      .from("courses")
      .select("*")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true),
  ]);

  const rawSlots = (slotsRes.data ?? []) as unknown as SlotRaw[];
  const courses  = (coursesRes.data ?? []) as CourseRow[];
  const trainers = (trainersRes.data ?? []) as { id: string; first_name: string; last_name: string }[];

  const trainerMap = Object.fromEntries(
    trainers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])
  );

  const slots: SlotWithDetails[] = rawSlots.map((s) => {
    const confirmedCount = s.bookings.filter((b) => b.status === "confirmed").length;
    const waitlistCount  = s.bookings.filter((b) => b.status === "waitlist").length;
    const capacity = s.max_capacity_override ?? s.courses?.max_capacity ?? 0;
    const trainerIds = s.class_slot_trainers.map((t) => t.trainer_id);
    const trainerNames = trainerIds
      .map((id) => trainerMap[id])
      .filter(Boolean) as string[];
    return {
      id: s.id,
      course_id: s.course_id,
      recurrence_id: s.recurrence_id,
      trainer_ids: trainerIds,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      is_cancelled: s.is_cancelled,
      cancellation_reason: s.cancellation_reason,
      capacity,
      confirmed_count: confirmedCount,
      waitlist_count: waitlistCount,
      course_name: s.courses?.name ?? "Corso",
      course_color: s.courses?.color ?? "#3b82f6",
      trainer_names: trainerNames,
    };
  });

  return (
    <CalendarClient
      weekStart={weekStart}
      view={view}
      viewDate={viewDate}
      slots={slots}
      courses={courses}
      trainers={trainers}
    />
  );
}
