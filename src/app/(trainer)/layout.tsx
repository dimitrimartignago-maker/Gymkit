import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const trainerNavItems = [
  {
    href: "/clients",
    label: "Clienti",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: "/plans/new",
    label: "Schede",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "Corsi",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/exercises",
    label: "Esercizi",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11" />
        <path d="M6.5 17.5h11" />
        <path d="M3 10.5h2.5v3H3z" />
        <path d="M18.5 10.5H21v3h-2.5z" />
        <path d="M1 10.5h2" />
        <path d="M21 10.5h2" />
      </svg>
    ),
  },
];

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
        <div
          className="flex items-center px-6 font-display font-bold text-lg text-[var(--color-text)] border-b border-[var(--color-border)]"
          style={{ height: "var(--nav-height)" }}
        >
          GymKit <span className="ml-2 text-xs text-[var(--color-accent)] font-normal">trainer</span>
        </div>
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1">
          {trainerNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-colors text-sm font-medium"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4">
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — mobile */}
        <header
          className="md:hidden flex items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
          style={{ height: "var(--nav-height)" }}
        >
          <span className="font-display font-bold text-base text-[var(--color-text)]">
            GymKit <span className="text-xs text-[var(--color-accent)] font-normal">trainer</span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center justify-center w-9 h-9 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </form>
        </header>

        <main className="flex-1 pb-[var(--bottom-bar-height)] md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] border-t border-[var(--color-border)]"
        style={{ height: "var(--bottom-bar-height)" }}
      >
        {trainerNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
