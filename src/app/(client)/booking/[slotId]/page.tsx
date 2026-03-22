import { getClientContext } from "@/lib/supabase/get-client-context";
import type { Database } from "@/lib/supabase/types";
import { notFound } from "next/navigation";
import { BookingClient } from "./BookingClient";

type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];

type SlotDetail = {
  id: string;
  course_id: string;
  trainer_id: string | null;
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  max_capacity_override: number | null;
  courses: {
    id: string;
    name: string;
    color: string | null;
    description: string | null;
    max_capacity: number;
    default_duration_minutes: number;
  } | null;
};

type BookingRow = {
  id: string;
  status: BookingStatus;
  waitlist_position: number | null;
  booked_at: string;
  profiles: { first_name: string; last_name: string } | null;
};

interface Props {
  params: { slotId: string };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function BookingSlotPage({ params }: Props) {
  const { supabase, profile } = await getClientContext();

  const { data: rawSlot } = await supabase
    .from("class_slots")
    .select(
      `id, course_id, trainer_id, starts_at, ends_at, is_cancelled, cancellation_reason, max_capacity_override, courses(id, name, color, description, max_capacity, default_duration_minutes)`
    )
    .eq("id", params.slotId)
    .single();

  const slot = (rawSlot ?? null) as unknown as SlotDetail | null;
  if (!slot) notFound();

  // Fetch bookings with client profiles
  const { data: rawBookings } = await supabase
    .from("bookings")
    .select(`id, status, waitlist_position, booked_at, profiles(first_name, last_name)`)
    .eq("class_slot_id", params.slotId)
    .neq("status", "cancelled")
    .order("booked_at");

  const bookings = (rawBookings ?? []) as unknown as BookingRow[];

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const capacity = slot.max_capacity_override ?? slot.courses?.max_capacity ?? 0;
  const available = capacity - confirmedCount;

  // Fetch my booking specifically
  const { data: myBookingData } = await supabase
    .from("bookings")
    .select("id, status, waitlist_position")
    .eq("class_slot_id", params.slotId)
    .eq("client_id", profile.id)
    .neq("status", "cancelled")
    .maybeSingle();

  // Fetch gym cancellation hours
  const { data: gym } = await supabase
    .from("gym")
    .select("booking_cancellation_hours")
    .eq("id", profile.gym_id)
    .single();

  const cancellationHours = gym?.booking_cancellation_hours ?? 24;

  // Determine if cancellation is still allowed
  const deadline = new Date(slot.starts_at);
  deadline.setHours(deadline.getHours() - cancellationHours);
  const canCancel = new Date() <= deadline;

  // Trainer name
  let trainerName: string | null = null;
  if (slot.trainer_id) {
    const { data: trainerProfile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", slot.trainer_id)
      .single();
    if (trainerProfile) {
      trainerName = `${trainerProfile.first_name} ${trainerProfile.last_name}`;
    }
  }

  return (
    <BookingClient
      slot={{
        id: slot.id,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
        is_cancelled: slot.is_cancelled,
        cancellation_reason: slot.cancellation_reason,
        course_name: slot.courses?.name ?? "Corso",
        course_color: slot.courses?.color ?? "#3b82f6",
        course_description: slot.courses?.description ?? null,
        capacity,
        confirmed_count: confirmedCount,
        available,
        formatted_start: formatDateTime(slot.starts_at),
        trainer_name: trainerName,
        duration_minutes: slot.courses?.default_duration_minutes ?? 60,
      }}
      myBooking={
        myBookingData
          ? {
              id: myBookingData.id,
              status: myBookingData.status as BookingStatus,
              waitlist_position: myBookingData.waitlist_position,
            }
          : null
      }
      cancellationHours={cancellationHours}
      canCancel={canCancel}
    />
  );
}
