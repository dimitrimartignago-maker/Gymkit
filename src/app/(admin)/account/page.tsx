import { Card, ThemeToggle } from "@/components/ui";
import { getAdminContext } from "@/lib/supabase/get-admin-context";
import { signOut } from "@/lib/actions/auth";
import { LogOut, Mail, Phone, User } from "lucide-react";

export default async function AdminProfilePage() {
  const { user, supabase } = await getAdminContext();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, phone, role")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const initials =
    (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-xl">
      <h1 className="text-xl font-semibold text-[var(--color-text)]">
        Profilo
      </h1>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-20 h-20 rounded-full bg-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-accent)] font-bold text-2xl">
          {initials.toUpperCase() || <User size={32} />}
        </div>
        <div className="text-center">
          <p className="font-semibold text-lg text-[var(--color-text)]">
            {profile.first_name} {profile.last_name}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)] capitalize">
            {profile.role}
          </p>
        </div>
      </div>

      {/* Info card */}
      <Card className="flex flex-col gap-0 divide-y divide-[var(--color-border)] p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-4">
          <Mail size={18} className="text-[var(--color-text-secondary)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--color-text-secondary)]">Email</span>
            <span className="text-sm text-[var(--color-text)] truncate">{profile.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-4">
          <Phone size={18} className="text-[var(--color-text-secondary)] shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs text-[var(--color-text-secondary)]">Telefono</span>
            <span className="text-sm text-[var(--color-text)] truncate">
              {profile.phone ?? "—"}
            </span>
          </div>
        </div>
      </Card>

      {/* Preferenze */}
      <Card className="flex flex-col gap-0 divide-y divide-[var(--color-border)] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-[var(--color-text)]">Tema</span>
          <ThemeToggle />
        </div>
      </Card>

      {/* Logout */}
      <form action={signOut}>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-[var(--radius-md)] border border-[var(--color-error)]/40 text-[var(--color-error)] text-sm font-semibold hover:bg-[var(--color-error)]/10 active:bg-[var(--color-error)]/20 transition-colors"
        >
          <LogOut size={18} />
          Esci dall&apos;account
        </button>
      </form>
    </div>
  );
}
