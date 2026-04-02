"use client";

import { getSlotBookings } from "@/app/(admin)/calendar/actions";
import type { SlotBooking } from "@/app/(trainer)/schedule/actions";
import { useEffect, useState } from "react";

interface Props {
  slotId: string;
}

export function AdminSlotAttendees({ slotId }: Props) {
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getSlotBookings(slotId).then((result) => {
      if (result.success) {
        setBookings(result.bookings ?? []);
      } else {
        setError(result.error ?? "Errore.");
      }
      setLoading(false);
    });
  }, [slotId]);

  if (loading) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Caricamento partecipanti…
      </p>
    );
  }

  if (error) {
    return <p className="text-sm text-[var(--color-error)]">{error}</p>;
  }

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-secondary)]">
        Nessuna prenotazione attiva.
      </p>
    );
  }

  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const waitlist = bookings.filter((b) => b.status === "waitlist");

  return (
    <div className="flex flex-col gap-2">
      {confirmed.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Confermati ({confirmed.length})
          </p>
          {confirmed.map((b) => (
            <div
              key={b.id}
              className="text-sm text-[var(--color-text)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)]"
            >
              {b.client_name}
            </div>
          ))}
        </div>
      )}
      {waitlist.length > 0 && (
        <div className="flex flex-col gap-1 mt-1">
          <p className="text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            In attesa ({waitlist.length})
          </p>
          {waitlist.map((b) => (
            <div
              key={b.id}
              className="text-sm text-[var(--color-text-secondary)] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)]"
            >
              {b.client_name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
