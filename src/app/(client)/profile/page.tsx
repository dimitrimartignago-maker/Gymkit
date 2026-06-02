import { Card, ThemeToggle } from "@/components/ui";
import { getClientContext } from "@/lib/supabase/get-client-context";
import { LogOut, Mail, Phone, User } from "lucide-react";
import { signOut, updateProfile } from "./actions";

export default async function ProfilePage() {
  const { profile } = await getClientContext();

  const initials =
    (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "");

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
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
            <span className="text-xs text-[var(--color-text-secondary)]">
              Email
            </span>
            <span className="text-sm text-[var(--color-text)] truncate">
              {profile.email}
            </span>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <form action={updateProfile} className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
          Modifica dati
        </h2>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="first_name" className="text-sm font-medium text-[var(--color-text)]">
              Nome
            </label>
            <input
              id="first_name"
              name="first_name"
              type="text"
              defaultValue={profile.first_name ?? ""}
              required
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label htmlFor="last_name" className="text-sm font-medium text-[var(--color-text)]">
              Cognome
            </label>
            <input
              id="last_name"
              name="last_name"
              type="text"
              defaultValue={profile.last_name ?? ""}
              required
              className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-[var(--color-text)]">
            <Phone size={14} className="inline mr-1.5 text-[var(--color-text-secondary)]" />
            Telefono
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            placeholder="+39 333 1234567"
            className="h-[var(--input-height)] w-full rounded-[var(--radius-md)] px-4 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] focus:border-[var(--color-accent)] outline-none text-sm transition-colors"
          />
        </div>
        <button
          type="submit"
          className="h-[var(--input-height)] rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Salva modifiche
        </button>
      </form>

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
