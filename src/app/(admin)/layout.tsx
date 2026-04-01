import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/ui";

const adminNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trainers", label: "Trainer" },
  { href: "/members", label: "Clienti" },
  { href: "/courses", label: "Corsi" },
  { href: "/settings", label: "Impostazioni" },
  { href: "/account", label: "Profilo" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
        <div
          className="flex items-center px-6 font-display font-bold text-lg text-[var(--color-text)] border-b border-[var(--color-border)]"
          style={{ height: "var(--nav-height)" }}
        >
          GymKit <span className="ml-2 text-xs text-[var(--color-accent)] font-normal">admin</span>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors text-sm font-medium"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 flex flex-col gap-1">
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-[var(--color-text-secondary)]">Tema</span>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors text-sm"
            >
              <LogOut size={16} />
              Esci
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
