import { getClientContext } from "@/lib/supabase/get-client-context";
import type { Database } from "@/lib/supabase/types";
import Link from "next/link";

type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];

type SlotForWeek = {
  id: string;
  course_id: string;
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  max_capacity_override: number | null;
  courses: { id: string; name: string; color: string | null; max_capacity: number } | null;
  bookings_confirmed: number;
  my_booking: { id: string; status: BookingStatus } | null;
};

const IT_DAYS = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function getWeekStart(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr + "T00:00:00") : new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatWeekRange(weekStart: string) {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function prevWeek(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}
function nextWeek(weekStart: string) {
  const d = new Date(weekStart + "T00:00:00");
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

interface Props {
  searchParams: { week?: string };
}

export default async function BookingPage({ searchParams }: Props) {
  const weekStart = getWeekStart(searchParams.week);
  const weekEnd = nextWeek(weekStart);

  const { supabase, profile } = await getClientContext();

  // Fetch slots for the week with booking counts
  const { data: rawSlots } = await supabase
    .from("class_slots")
    .select(`id, course_id, starts_at, ends_at, is_cancelled, max_capacity_override, courses(id, name, color, max_capacity), bookings(id, client_id, status)`)
    .gte("starts_at", weekStart + "T00:00:00")
    .lt("starts_at", weekEnd + "T00:00:00")
    .eq("is_cancelled", false)
    .order("starts_at");

  type RawSlot = {
    id: string;
    course_id: string;
    starts_at: string;
    ends_at: string;
    is_cancelled: boolean;
    max_capacity_override: number | null;
    courses: { id: string; name: string; color: string | null; max_capacity: number } | null;
    bookings: { id: string; client_id: string; status: string }[];
  };

  const rawSlotsTyped = (rawSlots ?? []) as unknown as RawSlot[];

  const slots: SlotForWeek[] = rawSlotsTyped.map((s) => {
    const confirmed = s.bookings.filter((b) => b.status === "confirmed").length;
    const myBookingRaw = s.bookings.find(
      (b) => b.client_id === profile.id && b.status !== "cancelled"
    );
    return {
      id: s.id,
      course_id: s.course_id,
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      is_cancelled: s.is_cancelled,
      max_capacity_override: s.max_capacity_override,
      courses: s.courses,
      bookings_confirmed: confirmed,
      my_booking: myBookingRaw
        ? { id: myBookingRaw.id, status: myBookingRaw.status as BookingStatus }
        : null,
    };
  });

  // Group slots by day (0=Mon … 6=Sun relative to weekStart)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    return d;
  });

  const slotsByDay = weekDates.map((date) => {
    const dateStr = date.toISOString().split("T")[0];
    return slots.filter((s) => s.starts_at.startsWith(dateStr));
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">
          Booking
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/booking?week=${prevWeek(weekStart)}`}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-sm"
          >
            ‹
          </Link>
          <span className="text-sm text-[var(--color-text-secondary)] min-w-[120px] text-center">
            {formatWeekRange(weekStart)}
          </span>
          <Link
            href={`/booking?week=${nextWeek(weekStart)}`}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-sm"
          >
            ›
          </Link>
        </div>
      </div>

      {/* Weekly grid — horizontal scroll */}
      <div className="overflow-x-auto flex-1 px-4 py-4">
        <div className="flex gap-3 min-w-max">
          {weekDates.map((date, dayIdx) => {
            const daySlots = slotsByDay[dayIdx];
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div key={date.toISOString()} className="w-40 flex flex-col gap-2">
                {/* Day header */}
                <div className="flex flex-col items-center gap-0.5 pb-1">
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                    {IT_DAYS[date.getDay()]}
                  </span>
                  <span
                    className={[
                      "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold",
                      isToday
                        ? "bg-[var(--color-accent)] text-white"
                        : "text-[var(--color-text)]",
                    ].join(" ")}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {/* Slots */}
                <div className="flex flex-col gap-2">
                  {daySlots.length === 0 && (
                    <div className="h-12 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)]" />
                  )}
                  {daySlots.map((slot) => {
                    const capacity =
                      slot.max_capacity_override ?? slot.courses?.max_capacity ?? 0;
                    const available = capacity - slot.bookings_confirmed;
                    const isFull = available <= 0;
                    const isBooked = slot.my_booking !== null;
                    const isWaitlist = slot.my_booking?.status === "waitlist";
                    const color = slot.courses?.color ?? "#3b82f6";

                    return (
                      <Link
                        key={slot.id}
                        href={`/booking/${slot.id}`}
                        className={[
                          "block rounded-[var(--radius-sm)] p-2 border-l-4 transition-opacity hover:opacity-80",
                          isBooked
                            ? "bg-[var(--color-accent)]/15 border-[var(--color-accent)]"
                            : "bg-[var(--color-surface-raised)]",
                        ].join(" ")}
                        style={isBooked ? undefined : { borderLeftColor: color }}
                      >
                        <div className="text-xs font-semibold text-[var(--color-text)]">
                          {formatTime(slot.starts_at)}
                        </div>
                        <div
                          className="text-[11px] truncate font-medium"
                          style={{ color: isBooked ? "var(--color-accent)" : color }}
                        >
                          {slot.courses?.name ?? "Corso"}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                          {isBooked
                            ? isWaitlist
                              ? "In lista"
                              : "Prenotato ✓"
                            : isFull
                            ? "Lista d'attesa"
                            : `${available} posti`}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
