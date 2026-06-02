"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/ui";
import { AdminMobileDrawer } from "@/components/ui/AdminMobileDrawer";

const adminNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trainers", label: "Trainer" },
  { href: "/members", label: "Clienti" },
  { href: "/courses", label: "Corsi" },
  { href: "/calendar", label: "Calendario" },
  { href: "/settings", label: "Impostazioni" },
  { href: "/account", label: "Profilo" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-bg)]">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] shrink-0">
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

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header mobile */}
        <header
          className="md:hidden flex items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]"
          style={{ height: "var(--nav-height)" }}
        >
          <span className="font-display font-bold text-base text-[var(--color-text)]">
            GymKit <span className="text-xs text-[var(--color-accent)] font-normal">admin</span>
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center justify-center w-10 h-10 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-all"
              aria-label="Apri menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Drawer mobile */}
      <AdminMobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
