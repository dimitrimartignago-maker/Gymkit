"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NumericInput } from "@/components/ui/Input";
import type { Database } from "@/lib/supabase/types";
import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { updateGymSettings } from "./actions";

type GymRow = Database["public"]["Tables"]["gym"]["Row"];

const PRESET_COLORS = [
  "#E94560", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6",
  "#ec4899", "#1A1A2E", "#0f172a", "#18181b",
];

interface Props {
  gym: GymRow;
}

export function SettingsClient({ gym }: Props) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(gym.name);
  const [slug, setSlug] = useState(gym.slug);
  const [primaryColor, setPrimaryColor] = useState(gym.primary_color ?? "#E94560");
  const [customColor, setCustomColor] = useState(gym.primary_color ?? "#E94560");
  const [cancellationHours, setCancellationHours] = useState(
    gym.booking_cancellation_hours ?? 24
  );

  function handleSave() {
    if (!name.trim()) {
      setError("Il nome è obbligatorio.");
      return;
    }
    setError("");
    setSaved(false);

    startTransition(async () => {
      const result = await updateGymSettings(gym.id, {
        name,
        slug,
        primary_color: primaryColor,
        booking_cancellation_hours: cancellationHours,
      });

      if (!result.success) {
        setError(result.error ?? "Errore.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-xl flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Impostazioni Palestra
        </h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          Configurazione generale della tua palestra.
        </p>
      </div>

      {/* Identità */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide border-b border-white/10 pb-2">
          Identità
        </h2>

        <Input
          label="Nome palestra"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. FitZone Milano"
        />

        <Input
          label="Slug (URL)"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="fitzone-milano"
          helperText="Usato nell'URL dell'app. Solo lettere minuscole e trattini."
        />
      </section>

      {/* Colore accent */}
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide border-b border-white/10 pb-2">
          Colore principale
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setPrimaryColor(c); setCustomColor(c); }}
                className={[
                  "w-9 h-9 rounded-full transition-all",
                  primaryColor === c
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110"
                    : "hover:scale-105",
                ].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setPrimaryColor(e.target.value); }}
              className="w-10 h-10 rounded-[var(--radius-sm)] border border-white/10 bg-transparent cursor-pointer p-0.5"
            />
            <span className="text-sm text-[var(--color-text-secondary)] font-mono">
              {primaryColor.toUpperCase()}
            </span>
            <div
              className="flex-1 h-10 rounded-[var(--radius-md)]"
              style={{ backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </section>

      {/* Booking */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide border-b border-white/10 pb-2">
          Prenotazioni
        </h2>

        <NumericInput
          label="Ore minime per cancellare una prenotazione"
          value={cancellationHours}
          onChange={setCancellationHours}
          min={0}
          max={168}
          unit="ore"
          helperText="I clienti non possono cancellare se mancano meno di N ore all'inizio della classe."
        />
      </section>

      {/* Save */}
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

      <Button
        size="lg"
        loading={isPending}
        onClick={handleSave}
        className={saved ? "bg-[var(--color-success)] hover:bg-[var(--color-success)]" : ""}
      >
        {saved ? (
          <>
            <Check size={16} />
            Salvato
          </>
        ) : (
          "Salva Impostazioni"
        )}
      </Button>
    </div>
  );
}
