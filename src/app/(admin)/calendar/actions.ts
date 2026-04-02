"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SlotBooking } from "@/app/(trainer)/schedule/actions";

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, gym_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") throw new Error("Non autorizzato");
  return { supabase: admin, profile };
}

interface SlotFormData {
  course_id: string;
  starts_at: string;
  ends_at: string;
  trainer_id: string | null;
}

export async function createSlot(
  data: SlotFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase.from("class_slots").insert({
      course_id: data.course_id,
      trainer_id: data.trainer_id || null,
      starts_at: data.starts_at,
      ends_at: data.ends_at,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

interface ScheduleFormData {
  course_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  trainer_id: string | null;
}

export async function createSchedule(
  data: ScheduleFormData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase.from("course_schedules").insert({
      course_id: data.course_id,
      day_of_week: data.day_of_week,
      start_time: data.start_time,
      end_time: data.end_time,
      trainer_id: data.trainer_id || null,
      is_active: true,
    });
    if (error) return { success: false, error: "Errore nella creazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function generateSlotsForWeek(
  weekStart: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();

    const { data: rawSchedules } = await supabase
      .from("course_schedules")
      .select("id, course_id, day_of_week, start_time, end_time, trainer_id")
      .eq("is_active", true);

    const schedules = rawSchedules ?? [];

    const { data: gymCourses } = await supabase
      .from("courses")
      .select("id")
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true);

    const gymCourseIds = new Set((gymCourses ?? []).map((c) => c.id));
    const monday = new Date(weekStart + "T00:00:00");
    const slotsToInsert: { course_id: string; trainer_id: string | null; starts_at: string; ends_at: string }[] = [];

    for (const sched of schedules) {
      if (!gymCourseIds.has(sched.course_id)) continue;
      const offset = sched.day_of_week - 1;
      const slotDate = new Date(monday);
      slotDate.setDate(monday.getDate() + offset);
      const dateStr = slotDate.toISOString().split("T")[0];
      const startsAt = `${dateStr}T${sched.start_time}`;
      const endsAt = `${dateStr}T${sched.end_time}`;
      const { data: existing } = await supabase
        .from("class_slots")
        .select("id")
        .eq("course_id", sched.course_id)
        .eq("starts_at", startsAt)
        .maybeSingle();
      if (!existing) {
        slotsToInsert.push({ course_id: sched.course_id, trainer_id: sched.trainer_id ?? null, starts_at: startsAt, ends_at: endsAt });
      }
    }

    if (slotsToInsert.length > 0) {
      const { error } = await supabase.from("class_slots").insert(slotsToInsert);
      if (error) return { success: false, error: "Errore nella generazione." };
    }
    revalidatePath("/calendar");
    return { success: true, count: slotsToInsert.length };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelSlot(
  slotId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { error } = await supabase
      .from("class_slots")
      .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
      .eq("id", slotId);
    if (error) return { success: false, error: "Errore nella cancellazione." };
    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function getSlotBookings(
  slotId: string
): Promise<{ success: boolean; bookings?: SlotBooking[]; error?: string }> {
  try {
    const { supabase } = await getAdmin();
    const { data: rawData, error } = await supabase
      .from("bookings")
      .select("id, status, booked_at, profiles!bookings_client_id_fkey(first_name, last_name)")
      .eq("class_slot_id", slotId)
      .neq("status", "cancelled")
      .order("booked_at");
    if (error) return { success: false, error: "Errore nel recupero prenotazioni." };
    const data = rawData as Array<{
      id: string;
      status: string;
      booked_at: string;
      profiles: { first_name: string; last_name: string } | null;
    }> | null;
    const bookings: SlotBooking[] = (data ?? []).map((b) => {
      const p = b.profiles;
      return { id: b.id, client_name: p ? `${p.first_name} ${p.last_name}` : "—", status: b.status, booked_at: b.booked_at };
    });
    return { success: true, bookings };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
