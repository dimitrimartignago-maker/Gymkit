"use client";

import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/types";
import {
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bookSlot, cancelBooking } from "../actions";

type BookingStatus = Database["public"]["Tables"]["bookings"]["Row"]["status"];

interface SlotInfo {
  id: string;
  starts_at: string;
  ends_at: string;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  course_name: string;
  course_color: string;
  course_description: string | null;
  capacity: number;
  confirmed_count: number;
  available: number;
  formatted_start: string;
  trainer_name: string | null;
  duration_minutes: number;
}

interface MyBooking {
  id: string;
  status: BookingStatus;
  waitlist_position: number | null;
}

interface Props {
  slot: SlotInfo;
  myBooking: MyBooking | null;
  cancellationHours: number;
  canCancel: boolean;
}

export function BookingClient({ slot, myBooking: initialBooking, cancellationHours, canCancel }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Optimistic state
  const [booking, setBooking] = useState<MyBooking | null>(initialBooking);
  const [confirmedCount, setConfirmedCount] = useState(slot.confirmed_count);
  const [actionError, setActionError] = useState("");

  const available = slot.capacity - confirmedCount;
  const isFull = available <= 0;
  const isPast = new Date(slot.starts_at) < new Date();

  function handleBook() {
    setActionError("");
    // Optimistic update
    const optimisticStatus = isFull ? "waitlist" : "confirmed";
    setBooking({ id: "optimistic", status: optimisticStatus, waitlist_position: null });
    if (!isFull) setConfirmedCount((n) => n + 1);

    startTransition(async () => {
      const result = await bookSlot(slot.id);
      if (!result.success) {
        // Revert
        setBooking(initialBooking);
        setConfirmedCount(slot.confirmed_count);
        setActionError(result.error ?? "Errore nella prenotazione.");
      } else {
        router.refresh();
      }
    });
  }

  function handleCancel() {
    if (!booking) return;
    setActionError("");
    const prevBooking = booking;
    const prevCount = confirmedCount;

    // Optimistic update
    setBooking(null);
    if (booking.status === "confirmed") setConfirmedCount((n) => n - 1);

    startTransition(async () => {
      const result = await cancelBooking(booking.id, slot.id);
      if (!result.success) {
        // Revert
        setBooking(prevBooking);
        setConfirmedCount(prevCount);
        setActionError(result.error ?? "Errore nella cancellazione.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--bottom-bar-height))]">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-6 flex flex-col gap-2"
        style={{ backgroundColor: slot.course_color + "25" }}
      >
        <Link
          href="/booking"
          className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors text-sm mb-2"
        >
          <ChevronLeft size={18} />
          Booking
        </Link>

        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: slot.course_color }}
        />
        <h1 className="text-2xl font-bold text-[var(--color-text)]">
          {slot.course_name}
        </h1>
        {slot.course_description && (
          <p className="text-sm text-[var(--color-text-secondary)]">
            {slot.course_description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 px-4 py-6 flex flex-col gap-5">
        {/* Cancelled banner */}
        {slot.is_cancelled && (
          <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
            <XCircle size={18} className="text-[var(--color-error)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--color-error)]">
                Slot cancellato
              </p>
              {slot.cancellation_reason && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  {slot.cancellation_reason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Info rows */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 text-sm">
            <CalendarClock size={18} className="text-[var(--color-text-secondary)] shrink-0" />
            <span className="text-[var(--color-text)] capitalize">
              {slot.formatted_start}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Clock size={18} className="text-[var(--color-text-secondary)] shrink-0" />
            <span className="text-[var(--color-text)]">
              {slot.duration_minutes} minuti
            </span>
          </div>
          {slot.trainer_name && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-[18px] h-[18px] rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center shrink-0">
                <span className="text-[8px] font-bold text-[var(--color-accent)]">T</span>
              </div>
              <span className="text-[var(--color-text)]">{slot.trainer_name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Users size={18} className="text-[var(--color-text-secondary)] shrink-0" />
            <div className="flex items-center gap-2">
              {/* Capacity bar */}
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(slot.capacity, 20) }).map((_, i) => (
                  <div
                    key={i}
                    className={[
                      "w-2 h-3 rounded-sm",
                      i < confirmedCount
                        ? "bg-[var(--color-accent)]"
                        : "bg-white/15",
                    ].join(" ")}
                  />
                ))}
                {slot.capacity > 20 && (
                  <span className="text-xs text-[var(--color-text-secondary)] ml-1 self-center">
                    +{slot.capacity - 20}
                  </span>
                )}
              </div>
              <span className="text-[var(--color-text-secondary)]">
                {confirmedCount}/{slot.capacity}
                {available > 0 ? ` · ${available} posti liberi` : " · Completo"}
              </span>
            </div>
          </div>
        </div>

        {/* Booking status */}
        {booking && (
          <div
            className={[
              "flex items-start gap-3 p-4 rounded-[var(--radius-md)] border",
              booking.status === "confirmed"
                ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]/20"
                : "bg-[var(--color-surface-raised)] border-white/10",
            ].join(" ")}
          >
            <CheckCircle2
              size={18}
              className={
                booking.status === "confirmed"
                  ? "text-[var(--color-accent)] shrink-0 mt-0.5"
                  : "text-[var(--color-text-secondary)] shrink-0 mt-0.5"
              }
            />
            <div>
              <p
                className={[
                  "text-sm font-semibold",
                  booking.status === "confirmed"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text)]",
                ].join(" ")}
              >
                {booking.status === "confirmed"
                  ? "Sei prenotato"
                  : `In lista d'attesa${booking.waitlist_position ? ` · Posizione ${booking.waitlist_position}` : ""}`}
              </p>
              {booking.status === "waitlist" && (
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                  Verrai notificato se si libera un posto.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <p className="text-sm text-[var(--color-error)]">{actionError}</p>
        )}

        {/* CTA */}
        {!slot.is_cancelled && !isPast && (
          <div className="mt-auto pt-4">
            {!booking ? (
              <Button size="lg" fullWidth loading={isPending} onClick={handleBook}>
                {isFull ? "Iscriviti alla lista d'attesa" : "Prenota"}
              </Button>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  size="lg"
                  fullWidth
                  loading={isPending}
                  disabled={!canCancel}
                  onClick={handleCancel}
                >
                  Cancella prenotazione
                </Button>
                {!canCancel && (
                  <p className="text-xs text-center text-[var(--color-text-secondary)]">
                    Non puoi cancellare meno di {cancellationHours} ore prima.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {isPast && !booking && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            Questo slot è già passato.
          </p>
        )}
      </div>
    </div>
  );
}
