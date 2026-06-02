import { getTrainerContext } from "@/lib/supabase/get-trainer-context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TrainerCoursesPage() {
  const { profile } = await getTrainerContext();
  const admin = createAdminClient();
  const { data: courses } = await admin
    .from("courses")
    .select("id, name, description, color, max_capacity, default_duration_minutes, is_active")
    .eq("gym_id", profile.gym_id)
    .order("name");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Corsi</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {(courses ?? []).length} corsi configurati
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden">
        {(courses ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
            Nessun corso disponibile.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
                  Corso
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
              </tr>
            </thead>
            <tbody>
              {(courses ?? []).map((course, i) => (
                <tr
                  key={course.id}
                  className={[
                    "border-b border-[var(--color-border-soft)] hover:bg-[var(--color-overlay)] transition-colors",
                    i === (courses?.length ?? 0) - 1 ? "border-b-0" : "",
                    !course.is_active ? "opacity-50" : "",
                  ].join(" ")}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: course.color ?? "#3b82f6" }}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-[var(--color-text)]">
                          {course.name}
                        </span>
                        {course.description && (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {course.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)]">
                    {course.max_capacity}
                  </td>
                  <td className="px-4 py-3 text-center text-[var(--color-text-secondary)] hidden md:table-cell">
                    {course.default_duration_minutes}min
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={[
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        course.is_active
                          ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                          : "bg-[var(--color-border)] text-[var(--color-text-secondary)]",
                      ].join(" ")}
                    >
                      {course.is_active ? "Attivo" : "Inattivo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
