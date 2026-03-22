"use server";

import { createClient } from "@/lib/supabase/server";

async function getTrainer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, gym_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");
  return { supabase, profile };
}

// Generate class_slots for a given week from active course_schedules.
// weekStart must be a YYYY-MM-DD string (Monday).
export async function generateSlotsForWeek(
  weekStart: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { supabase, profile } = await getTrainer();

    // Fetch active schedules for this gym's courses
    const { data: rawSchedules } = await supabase
      .from("course_schedules")
      .select("id, course_id, day_of_week, start_time, end_time, trainer_id")
      .eq("is_active", true);

    const schedules = rawSchedules ?? [];

    // Fetch gym's course ids to filter
    const { data: gymCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true);

    const gymCourseIds = new Set((gymCourses ?? []).map((c) => c.id));

    const monday = new Date(weekStart + "T00:00:00");
    const slotsToInsert: {
      course_id: string;
      trainer_id: string | null;
      starts_at: string;
      ends_at: string;
    }[] = [];

    for (const sched of schedules) {
      if (!gymCourseIds.has(sched.course_id)) continue;

      // ISO day_of_week: 1=Mon, 7=Sun → offset from Monday = day_of_week - 1
      const offset = sched.day_of_week - 1;
      const slotDate = new Date(monday);
      slotDate.setDate(monday.getDate() + offset);
      const dateStr = slotDate.toISOString().split("T")[0];

      const startsAt = `${dateStr}T${sched.start_time}`;
      const endsAt = `${dateStr}T${sched.end_time}`;

      // Check if slot already exists
      const { data: existing } = await supabase
        .from("class_slots")
        .select("id")
        .eq("course_id", sched.course_id)
        .eq("starts_at", startsAt)
        .maybeSingle();

      if (!existing) {
        slotsToInsert.push({
          course_id: sched.course_id,
          trainer_id: sched.trainer_id ?? null,
          starts_at: startsAt,
          ends_at: endsAt,
        });
      }
    }

    if (slotsToInsert.length > 0) {
      const { error } = await supabase
        .from("class_slots")
        .insert(slotsToInsert);
      if (error) return { success: false, error: "Errore nella generazione." };
    }

    return { success: true, count: slotsToInsert.length };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

interface SlotFormData {
  course_id: string;
  starts_at: string; // ISO datetime
  ends_at: string;
  trainer_id: string | null;
}

export async function createSlot(
  data: SlotFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getTrainer();
    const { error } = await supabase.from("class_slots").insert({
      course_id: data.course_id,
      trainer_id: data.trainer_id || null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

interface ScheduleFormData {
  course_id: string;
  day_of_week: number; // 1=Mon, 7=Sun
  start_time: string; // "HH:MM:SS"
  end_time: string;
  trainer_id: string | null;
}

export async function createSchedule(
  data: ScheduleFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getTrainer();
    const { error } = await supabase.from("course_schedules").insert({
      course_id: data.course_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      trainer_id: data.trainer_id || null,
      is_active: true,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelSlot(
  slotId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getTrainer();
    const { error } = await supabase
      .from("class_slots")
      .update({
        is_cancelled: true,
        cancellation_reason: reason.trim() || null,
      })
      .eq("id", slotId);
    if (error) return { success: false, error: "Errore nella cancellazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
