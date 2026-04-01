import { getAdminContext } from "@/lib/supabase/get-admin-context";
import { Card } from "@/components/ui/Card";
import { Users, UserCheck, CalendarDays, BookOpen } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function AdminDashboardPage() {
  const { supabase, profile } = await getAdminContext();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [trainersRes, clientsRes, coursesRes, slotsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", profile.gym_id)
      .eq("role", "trainer")
      .eq("is_active", true),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", profile.gym_id)
      .eq("role", "client")
      .eq("is_active", true),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("gym_id", profile.gym_id)
      .eq("is_active", true),
    supabase
      .from("class_slots")
      .select("id, starts_at, ends_at, courses(name, color)")
      .eq("is_cancelled", false)
      .gte("starts_at", todayStart.toISOString())
      .lte("starts_at", todayEnd.toISOString())
      .order("starts_at"),
  ]);

  const stats = [
    {
      label: "Trainer attivi",
      value: trainersRes.count ?? 0,
      icon: UserCheck,
    },
    {
      label: "Clienti attivi",
      value: clientsRes.count ?? 0,
      icon: Users,
    },
    {
      label: "Corsi attivi",
      value: coursesRes.count ?? 0,
      icon: BookOpen,
    },
    {
      label: "Classi oggi",
      value: (slotsRes.data ?? []).length,
      icon: CalendarDays,
    },
  ];

  type SlotWithCourse = {
    id: string;
    starts_at: string;
    ends_at: string;
    courses: { name: string; color: string | null } | null;
  };
  const todaySlots = (slotsRes.data ?? []) as unknown as SlotWithCourse[];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          {new Date().toLocaleDateString("it-IT", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">{s.label}</span>
              <s.icon size={16} className="text-[var(--color-text-secondary)]" />
            </div>
            <span className="text-3xl font-bold text-[var(--color-text)]">{s.value}</span>
          </Card>
        ))}
      </div>

      {/* Today's schedule */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          Classi di oggi
        </h2>
        {todaySlots.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] italic">
            Nessuna classe programmata per oggi.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {todaySlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] border border-[var(--color-border)]"
              >
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: slot.courses?.color ?? "var(--color-accent)" }}
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {slot.courses?.name ?? "Corso"}
                  </span>
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    {formatTime(slot.starts_at)} – {formatTime(slot.ends_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
