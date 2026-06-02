"use client";

import Link from "next/link";
import { LogOut, Users, FileText, Calendar, Dumbbell, BookOpen } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/ui";
import { usePathname } from "next/navigation";

const trainerNavItems = [
  {
    href: "/clients",
    label: "Clienti",
    icon: Users,
  },
  {
    href: "/templates",
    label: "Template",
    icon: FileText,
  },
  {
    href: "/corsi",
    label: "Corsi",
    icon: BookOpen,
  },
  {
    href: "/schedule",
    label: "Calendario",
    icon: Calendar,
  },
  {
    href: "/exercises",
    label: "Esercizi",
    icon: Dumbbell,
  },
];

export default function TrainerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
        <div
          className="flex items-center px-6 font-display font-bold text-lg text-[var(--color-text)] border-b border-[var(--color-border)]"
          style={{ height: "var(--nav-height)" }}
        >
          GymKit <span className="ml-2 text-xs text-[var(--color-accent)] font-normal">trainer</span>
        </div>
        <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5">
          {trainerNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                  active
                    ? "bg-[var(--color-accent)] text-white shadow-md shadow-[var(--color-accent)]/20"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-4 pb-6 flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tema</span>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all duration-200 text-sm font-medium"
            >
              <LogOut size={18} />
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
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center justify-center w-10 h-10 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-all"
              >
                <LogOut size={20} />
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 pb-[var(--bottom-bar-height)] md:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] border-t border-[var(--color-border)] px-2"
        style={{ height: "var(--bottom-bar-height)" }}
      >
        {trainerNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 min-w-[64px] min-h-[48px] justify-center flex-1 transition-all duration-200 ${
                active
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${active ? "bg-[var(--color-accent)]/10" : ""}`}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold tracking-tight ${active ? "text-[var(--color-accent)]" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
