"use client";

import { Modal } from "@/components/ui/Modal";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS } from "@/lib/exercise-constants";
import type { Database } from "@/lib/supabase/types";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";

export type ExerciseRow = Database["public"]["Tables"]["exercises"]["Row"];

interface Props {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseRow[];
  onSelect: (exercise: ExerciseRow) => void;
}

const muscleLabel = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, m.label]));
const equipLabel  = Object.fromEntries(EQUIPMENT_OPTIONS.map((e) => [e.value, e.label]));

export function ExercisePicker({ open, onClose, exercises, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscleFilter && e.muscle_group !== muscleFilter) return false;
      return true;
    });
  }, [exercises, search, muscleFilter]);

  const handleSelect = (ex: ExerciseRow) => {
    onSelect(ex);
    setSearch("");
    setMuscleFilter("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Aggiungi esercizio">
      <div className="flex flex-col gap-3">
        {/* Ricerca */}
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
          />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca esercizio…"
            className="h-10 w-full rounded-[var(--radius-md)] pl-9 pr-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
          />
        </div>

        {/* Filtro muscolo */}
        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          className="h-10 rounded-[var(--radius-md)] px-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
        >
          <option value="">Tutti i muscoli</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>

        {/* Lista */}
        <div className="flex flex-col gap-1 max-h-72 overflow-y-auto -mx-1 px-1">
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--color-text-secondary)] text-center py-6">
              Nessun esercizio trovato.
            </p>
          )}
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => handleSelect(ex)}
              className="flex items-start gap-3 px-3 py-2.5 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-raised)] transition-colors text-left"
            >
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <span className="text-sm font-medium text-[var(--color-text)] truncate">
                  {ex.name}
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {ex.muscle_group && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                      {muscleLabel[ex.muscle_group] ?? ex.muscle_group}
                    </span>
                  )}
                  {ex.equipment && ex.equipment !== "nessuno" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-overlay-md)] text-[var(--color-text-secondary)]">
                      {equipLabel[ex.equipment] ?? ex.equipment}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
