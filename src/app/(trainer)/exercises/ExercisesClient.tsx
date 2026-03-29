"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EQUIPMENT_OPTIONS, MUSCLE_GROUPS } from "@/lib/exercise-constants";
import type { Database } from "@/lib/supabase/types";
import { Dumbbell, Pencil, Plus, Search, Trash2, Copy } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  cloneExercise,
  createExercise,
  deleteExercise,
  updateExercise,
} from "./actions";

type Exercise = Database["public"]["Tables"]["exercises"]["Row"];

interface Props {
  exercises: Exercise[];
  trainerId: string;
}

const emptyForm = { name: "", muscle_group: "", equipment: "", description: "" };

const muscleLabel = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m.value, m.label]));
const equipLabel = Object.fromEntries(EQUIPMENT_OPTIONS.map((e) => [e.value, e.label]));

export function ExercisesClient({ exercises: initial, trainerId }: Props) {
  const [exercises, setExercises] = useState(initial);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipFilter, setEquipFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscleFilter && e.muscle_group !== muscleFilter) return false;
      if (equipFilter && e.equipment !== equipFilter) return false;
      return true;
    });
  }, [exercises, search, muscleFilter, equipFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (ex: Exercise) => {
    setEditing(ex);
    setForm({
      name: ex.name,
      muscle_group: ex.muscle_group,
      equipment: ex.equipment ?? "",
      description: ex.description ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleClone = (ex: Exercise) => {
    startTransition(async () => {
      const result = await cloneExercise(ex.id);
      if (result.success) {
        setExercises((prev) => [result.exercise, ...prev]);
        openEdit(result.exercise);
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Eliminare questo esercizio?")) return;
    startTransition(async () => {
      const result = await deleteExercise(id);
      if (result.success) setExercises((prev) => prev.filter((e) => e.id !== id));
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name.trim() || !form.muscle_group) {
      setFormError("Nome e gruppo muscolare sono obbligatori.");
      return;
    }
    startTransition(async () => {
      if (editing) {
        const result = await updateExercise(editing.id, form);
        if (result.success) {
          setExercises((prev) =>
            prev.map((e) => (e.id === editing.id ? result.exercise : e))
          );
          setModalOpen(false);
        } else {
          setFormError(result.error);
        }
      } else {
        const result = await createExercise(form);
        if (result.success) {
          setExercises((prev) => [result.exercise, ...prev]);
          setModalOpen(false);
        } else {
          setFormError(result.error);
        }
      }
    });
  };

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold text-[var(--color-text)]">
          Libreria Esercizi
          <span className="ml-2 text-sm font-normal text-[var(--color-text-secondary)]">
            ({filtered.length})
          </span>
        </h1>
        <Button variant="primary" size="md" onClick={openNew}>
          <Plus size={16} />
          Aggiungi
        </Button>
      </div>

      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] pointer-events-none"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca esercizio…"
            className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] pl-9 pr-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
          />
        </div>
        <select
          value={muscleFilter}
          onChange={(e) => setMuscleFilter(e.target.value)}
          className="h-[var(--input-height)] rounded-[var(--radius-md)] px-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
        >
          <option value="">Tutti i muscoli</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={equipFilter}
          onChange={(e) => setEquipFilter(e.target.value)}
          className="h-[var(--input-height)] rounded-[var(--radius-md)] px-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm"
        >
          <option value="">Tutti i mezzi</option>
          {EQUIPMENT_OPTIONS.map((eq) => (
            <option key={eq.value} value={eq.value}>{eq.label}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title="Nessun esercizio trovato"
          description="Prova a cambiare i filtri o aggiungi un nuovo esercizio."
          ctaLabel="Aggiungi esercizio"
          onCta={openNew}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ex) => {
            const isOwn = ex.created_by === trainerId;
            return (
              <Card key={ex.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-text)] text-sm leading-tight truncate">
                      {ex.name}
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {ex.muscle_group && (
                        <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-sm)] text-xs bg-[var(--color-accent)]/15 text-[var(--color-accent)]">
                          {muscleLabel[ex.muscle_group] ?? ex.muscle_group}
                        </span>
                      )}
                      {ex.equipment && ex.equipment !== "nessuno" && (
                        <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-sm)] text-xs bg-[var(--color-overlay-md)] text-[var(--color-text-secondary)]">
                          {equipLabel[ex.equipment] ?? ex.equipment}
                        </span>
                      )}
                      {ex.is_default && (
                        <span className="inline-flex px-2 py-0.5 rounded-[var(--radius-sm)] text-xs bg-[var(--color-overlay)] text-[var(--color-text-secondary)]">
                          default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {ex.is_default ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClone(ex)}
                        disabled={isPending}
                        title="Duplica e modifica"
                      >
                        <Copy size={14} />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ex)}
                          title="Modifica"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ex.id)}
                          disabled={isPending}
                          title="Elimina"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {ex.description && (
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {ex.description}
                  </p>
                )}
                {isOwn && ex.cloned_from && (
                  <p className="text-[10px] text-[var(--color-text-secondary)] italic">
                    Duplicato da esercizio default
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal crea/modifica */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifica esercizio" : "Nuovo esercizio"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nome *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="es. Panca Piana — Bilanciere"
            required
            disabled={isPending}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Gruppo muscolare *
            </label>
            <select
              value={form.muscle_group}
              onChange={(e) => setForm((p) => ({ ...p, muscle_group: e.target.value }))}
              required
              disabled={isPending}
              className="h-[var(--input-height)] rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
            >
              <option value="">Seleziona…</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">Attrezzo</label>
            <select
              value={form.equipment}
              onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))}
              disabled={isPending}
              className="h-[var(--input-height)] rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none"
            >
              <option value="">Nessuno</option>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq.value} value={eq.value}>{eq.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">Descrizione</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Istruzioni di esecuzione…"
              rows={3}
              disabled={isPending}
              className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none resize-none text-sm placeholder:text-[var(--color-text-secondary)]"
            />
          </div>

          {formError && (
            <p className="text-sm text-[var(--color-error)]">{formError}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="md"
              fullWidth
              onClick={() => setModalOpen(false)}
              disabled={isPending}
            >
              Annulla
            </Button>
            <Button type="submit" variant="primary" size="md" fullWidth loading={isPending}>
              {editing ? "Salva" : "Crea"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
