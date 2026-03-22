"use server";

import { createClient } from "@/lib/supabase/server";

export async function bookSlot(
  slotId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    // Check existing non-cancelled booking
    const { data: existing } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("class_slot_id", slotId)
      .eq("client_id", user.id)
      .neq("status", "cancelled")
      .maybeSingle();

    if (existing) return { success: false, error: "Hai già una prenotazione per questo slot." };

    // Get slot capacity info
    const { data: slotData } = await supabase
      .from("class_slots")
      .select("id, max_capacity_override, course_id, is_cancelled, starts_at")
      .eq("id", slotId)
      .single();

    if (!slotData) return { success: false, error: "Slot non trovato." };
    if (slotData.is_cancelled) return { success: false, error: "Questo slot è stato cancellato." };
    if (new Date(slotData.starts_at) < new Date()) {
      return { success: false, error: "Non puoi prenotare uno slot passato." };
    }

    const { data: course } = await supabase
      .from("courses")
      .select("max_capacity")
      .eq("id", slotData.course_id)
      .single();

    const capacity = slotData.max_capacity_override ?? course?.max_capacity ?? 0;

    // Count confirmed bookings
    const { count: confirmedCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("class_slot_id", slotId)
      .eq("status", "confirmed");

    const confirmed = confirmedCount ?? 0;
    const isWaitlist = confirmed >= capacity;

    let waitlistPosition: number | null = null;
    if (isWaitlist) {
      const { count: waitlistCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("class_slot_id", slotId)
        .eq("status", "waitlist");
      waitlistPosition = (waitlistCount ?? 0) + 1;
    }

    const { error } = await supabase.from("bookings").insert({
      class_slot_id: slotId,
      client_id: user.id,
      status: isWaitlist ? "waitlist" : "confirmed",
      waitlist_position: waitlistPosition,
    });

    if (error) return { success: false, error: "Errore nella prenotazione." };
    return { success: true, status: isWaitlist ? "waitlist" : "confirmed" };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}

export async function cancelBooking(
  bookingId: string,
  slotId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Non autenticato." };

    // Get gym cancellation policy
    const { data: profile } = await supabase
      .from("profiles")
      .select("gym_id")
      .eq("id", user.id)
      .single();

    const { data: gym } = await supabase
      .from("gym")
      .select("booking_cancellation_hours")
      .eq("id", profile?.gym_id ?? "")
      .single();

    const hoursLimit = gym?.booking_cancellation_hours ?? 24;

    // Get slot start time
    const { data: slot } = await supabase
      .from("class_slots")
      .select("starts_at")
      .eq("id", slotId)
      .single();

    if (!slot) return { success: false, error: "Slot non trovato." };

    const deadline = new Date(slot.starts_at);
    deadline.setHours(deadline.getHours() - hoursLimit);

    if (new Date() > deadline) {
      return {
        success: false,
        error: `Non puoi cancellare meno di ${hoursLimit} ore prima dell'inizio.`,
      };
    }

    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", bookingId)
      .eq("client_id", user.id);

    if (error) return { success: false, error: "Errore nella cancellazione." };
    return { success: true };
  } catch {
    return { success: false, error: "Errore imprevisto." };
  }
}
