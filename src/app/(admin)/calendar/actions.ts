"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
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

export interface CreateSlotsInput {
  course_id: string;
  start_date: string;       // "YYYY-MM-DD"
  start_time: string;       // "HH:MM"
  end_time: string;         // "HH:MM"
  trainer_ids: string[];
  repeat: false | {
    days_of_week: number[]; // 1=Lun … 7=Dom
    until: string;          // "YYYY-MM-DD"
  };
}

/** Returns all YYYY-MM-DD dates from startDate to until (inclusive) that fall on daysOfWeek */
function generateDates(startDate: string, daysOfWeek: number[], until: string): string[] {
  const dates: string[] = [];
  const end = new Date(until + "T00:00:00");
  const cur = new Date(startDate + "T00:00:00");
  while (cur <= end) {
    const jsDay = cur.getDay(); // 0=Sun
    const dow = jsDay === 0 ? 7 : jsDay; // 1=Mon…7=Sun
    if (daysOfWeek.includes(dow)) {
      dates.push(cur.toISOString().split("T")[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export async function createSlots(
  data: CreateSlotsInput
): Promise<{ success: boolean; created?: number; skipped?: number; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();

    // Verify course belongs to admin's gym
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .eq("id", data.course_id)
      .eq("gym_id", profile.gym_id)
      .maybeSingle();
    if (!course) return { success: false, error: "Corso non trovato o non autorizzato." };

    const dates: string[] = data.repeat === false
      ? [data.start_date]
      : generateDates(data.start_date, data.repeat.days_of_week, data.repeat.until);

    const recurrenceId = data.repeat !== false ? randomUUID() : null;
    let created = 0;
    let skipped = 0;

    for (const date of dates) {
      const starts_at = `${date}T${data.start_time}:00`;
      const ends_at = `${date}T${data.end_time}:00`;

      // Skip duplicates silently
      const { data: existing } = await supabase
        .from("class_slots")
        .select("id")
        .eq("course_id", data.course_id)
        .eq("starts_at", starts_at)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const { data: newSlot, error: insertError } = await supabase
        .from("class_slots")
        .insert({ course_id: data.course_id, starts_at, ends_at, recurrence_id: recurrenceId })
        .select("id")
        .single();

      if (insertError || !newSlot) {
        return { success: false, error: "Errore nella creazione degli slot." };
      }

      if (data.trainer_ids.length > 0) {
        const { error: trainerError } = await supabase
          .from("class_slot_trainers")
          .insert(data.trainer_ids.map((tid) => ({ slot_id: newSlot.id, trainer_id: tid })));
        if (trainerError) {
          return { success: false, error: "Errore nell'assegnazione dei trainer." };
        }
      }

      created++;
    }

    revalidatePath("/calendar");
    return { success: true, created, skipped };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

async function verifySlotOwnership(
  supabase: ReturnType<typeof createAdminClient>,
  slotId: string,
  gymId: string
): Promise<boolean> {
  const { data: slot } = await supabase
    .from("class_slots")
    .select("course_id")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return false;
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("id", slot.course_id)
    .eq("gym_id", gymId)
    .maybeSingle();
  return !!course;
}

export async function updateSlot(
  slotId: string,
  data: { start_time: string; end_time: string; trainer_ids: string[] },
  scope: "single" | "series"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    if (!(await verifySlotOwnership(supabase, slotId, profile.gym_id))) {
      return { success: false, error: "Non autorizzato." };
    }

    let slotIds: string[] = [slotId];

    if (scope === "series") {
      const { data: targetSlot } = await supabase
        .from("class_slots")
        .select("recurrence_id")
        .eq("id", slotId)
        .single();
      if (!targetSlot?.recurrence_id) {
        return { success: false, error: "Slot non parte di una serie." };
      }
      const { data: seriesSlots } = await supabase
        .from("class_slots")
        .select("id")
        .eq("recurrence_id", targetSlot.recurrence_id)
        .eq("is_cancelled", false);
      slotIds = (seriesSlots ?? []).map((s) => s.id);
    }

    for (const id of slotIds) {
      const { data: slot } = await supabase
        .from("class_slots")
        .select("starts_at")
        .eq("id", id)
        .single();
      if (!slot) continue;

      const date = slot.starts_at.substring(0, 10);
      const { error: updateError } = await supabase
        .from("class_slots")
        .update({
          starts_at: `${date}T${data.start_time}:00`,
          ends_at: `${date}T${data.end_time}:00`,
        })
        .eq("id", id);
      if (updateError) return { success: false, error: "Errore nella modifica." };

      // Replace trainers: delete + insert
      await supabase.from("class_slot_trainers").delete().eq("slot_id", id);
      if (data.trainer_ids.length > 0) {
        await supabase
          .from("class_slot_trainers")
          .insert(data.trainer_ids.map((tid) => ({ slot_id: id, trainer_id: tid })));
      }
    }

    revalidatePath("/calendar");
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelSlot(
  slotId: string,
  reason: string,
  scope: "single" | "series"
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, profile } = await getAdmin();
    if (!(await verifySlotOwnership(supabase, slotId, profile.gym_id))) {
      return { success: false, error: "Non autorizzato." };
    }

    if (scope === "single") {
      const { error } = await supabase
        .from("class_slots")
        .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
        .eq("id", slotId);
      if (error) return { success: false, error: "Errore nella cancellazione." };
    } else {
      const { data: targetSlot } = await supabase
        .from("class_slots")
        .select("recurrence_id")
        .eq("id", slotId)
        .single();
      if (!targetSlot?.recurrence_id) {
        return { success: false, error: "Slot non parte di una serie." };
      }
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("class_slots")
        .update({ is_cancelled: true, cancellation_reason: reason.trim() || null })
        .eq("recurrence_id", targetSlot.recurrence_id)
        .gt("starts_at", now);
      if (error) return { success: false, error: "Errore nella cancellazione della serie." };
    }

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

// Legacy compatibility wrappers
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
      starts_at: data.starts_at,
      ends_at: data.ends_at,
      recurrence_id: null,
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
    const slotsToInsert: { course_id: string; starts_at: string; ends_at: string; recurrence_id: null }[] = [];

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
        slotsToInsert.push({ course_id: sched.course_id, starts_at: startsAt, ends_at: endsAt, recurrence_id: null });
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
