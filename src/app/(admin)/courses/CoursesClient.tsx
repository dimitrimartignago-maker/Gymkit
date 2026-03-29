"use client";

import { Button } from "@/components/ui/Button";
import { Input, NumericInput } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Database } from "@/lib/supabase/types";
import { Edit2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCourse, toggleCourseStatus, updateCourse } from "./actions";

type CourseRow = Database["public"]["Tables"]["courses"]["Row"];
type TrainerProfile = { id: string; first_name: string; last_name: string };

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899",
];

interface CourseForm {
  name: string;
  description: string;
  color: string;
  max_capacity: number;
  default_duration_minutes: number;
  trainer_id: string;
  is_active: boolean;
}

const DEFAULT_FORM: CourseForm = {
  name: "",
  description: "",
  color: PRESET_COLORS[5],
  max_capacity: 15,
  default_duration_minutes: 60,
  trainer_id: "",
  is_active: true,
};

interface Props {
  courses: CourseRow[];
  trainers: TrainerProfile[];
}

export function CoursesClient({ courses: initial, trainers }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState(initial);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourseRow | null>(null);
  const [form, setForm] = useState<CourseForm>(DEFAULT_FORM);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setError("");
    setModalOpen(true);
  }

  function openEdit(course: CourseRow) {
    setEditing(course);
    setForm({
      name: course.name,
      description: course.description ?? "",
      color: course.color ?? PRESET_COLORS[5],
      max_capacity: course.max_capacity,
      default_duration_minutes: course.default_duration_minutes,
      trainer_id: course.trainer_id ?? "",
      is_active: course.is_active,
    });
    setError("");
    setModalOpen(true);
  }

  function patch(patch: Partial<CourseForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Il nome è obbligatorio.");
      return;
    }
    setError("");

    startTransition(async () => {
      const data = {
        name: form.name,
        description: form.description,
        color: form.color,
        max_capacity: form.max_capacity,
        default_duration_minutes: form.default_duration_minutes,
        trainer_id: form.trainer_id || null,
        is_active: form.is_active,
      };

      const result = editing
        ? await updateCourse(editing.id, data)
        : await createCourse(data);

      if (!result.success) {
        setError(result.error ?? "Errore.");
        return;
      }

      setModalOpen(false);
      router.refresh();
    });
  }

  function handleToggle(course: CourseRow) {
    startTransition(async () => {
      const result = await toggleCourseStatus(course.id, !course.is_active);
      if (result.success) {
        setCourses((prev) =>
          prev.map((c) =>
            c.id === course.id ? { ...c, is_active: !course.is_active } : c
          )
        );
      }
    });
  }

  const trainerNameMap = Object.fromEntries(
    trainers.map((t) => [t.id, `${t.first_name} ${t.last_name}`])
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">
            Corsi
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {courses.length} corsi configurati
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} />
          Nuovo Corso
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Corso
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden sm:table-cell">
                Trainer
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Cap.
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide hidden md:table-cell">
                Durata
              </th>
              <th className="text-center px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                Stato
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {courses.map((course, i) => (
              <tr
                key={course.id}
                className={[
                  "border-b border-[var(--color-border-soft)] hover:bg-[var(--color-overlay)] transition-colors",
                  i === courses.length - 1 ? "border-b-0" : "",
                  !course.is_active ? "opacity-50" : "",
                ].join(" ")}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: course.color ?? "#3b82f6" }}
                    />
                    <span className="font-medium text-[var(--color-text)]">
                      {course.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">
                  {course.trainer_id ? trainerNameMap[course.trainer_id] ?? "—" : "—"}
                </td>
                <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">
                  {course.max_capacity}
                </td>
                <td className="px-4 py-3 text-center text-[var(--color-text-secondary)] hidden md:table-cell">
                  {course.default_duration_minutes}min
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => handleToggle(course)}
                    disabled={isPending}
                    className="transition-opacity disabled:opacity-50"
                  >
                    {course.is_active ? (
                      <ToggleRight size={22} className="text-[var(--color-accent)]" />
                    ) : (
                      <ToggleLeft size={22} className="text-[var(--color-text-secondary)]" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(course)}
                    className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {courses.length === 0 && (
          <div className="py-12 text-center text-[var(--color-text-secondary)] text-sm">
            Nessun corso ancora. Creane uno per iniziare.
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Modifica Corso" : "Nuovo Corso"}
      >
        <div className="flex flex-col gap-4 pt-2">
          <Input
            label="Nome corso *"
            value={form.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Es. Yoga Flow, Spinning, HIIT…"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Descrizione
            </label>
            <textarea
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Descrizione breve del corso…"
              rows={2}
              className="w-full rounded-[var(--radius-md)] px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm placeholder:text-[var(--color-text-secondary)] resize-none transition-colors"
            />
          </div>

          {/* Color picker */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Colore
            </label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => patch({ color: c })}
                  className={[
                    "w-8 h-8 rounded-full transition-all",
                    form.color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--color-surface)] scale-110" : "",
                  ].join(" ")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <NumericInput
              label="Capacità massima"
              value={form.max_capacity}
              onChange={(v) => patch({ max_capacity: v })}
              min={1}
              max={200}
              unit="posti"
            />
            <NumericInput
              label="Durata (min)"
              value={form.default_duration_minutes}
              onChange={(v) => patch({ default_duration_minutes: v })}
              min={15}
              max={240}
              step={15}
              unit="min"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Trainer predefinito
            </label>
            <select
              value={form.trainer_id}
              onChange={(e) => patch({ trainer_id: e.target.value })}
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            >
              <option value="">— Nessuno —</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.first_name} {t.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* is_active toggle */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">
                Corso attivo
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                I corsi inattivi non compaiono nel calendario
              </p>
            </div>
            <button
              type="button"
              onClick={() => patch({ is_active: !form.is_active })}
            >
              {form.is_active ? (
                <ToggleRight size={28} className="text-[var(--color-accent)]" />
              ) : (
                <ToggleLeft size={28} className="text-[var(--color-text-secondary)]" />
              )}
            </button>
          </div>

          {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}

          <Button fullWidth loading={isPending} onClick={handleSubmit}>
            {editing ? "Salva Modifiche" : "Crea Corso"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
