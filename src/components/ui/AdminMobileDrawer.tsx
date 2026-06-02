"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LogOut,
  LayoutDashboard,
  Users,
  UserCheck,
  BookOpen,
  Calendar,
  Settings,
  UserCircle,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/ui";

const adminNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trainers", label: "Trainer", icon: Users },
  { href: "/members", label: "Clienti", icon: UserCheck },
  { href: "/courses", label: "Corsi", icon: BookOpen },
  { href: "/calendar", label: "Calendario", icon: Calendar },
  { href: "/settings", label: "Impostazioni", icon: Settings },
  { href: "/account", label: "Profilo", icon: UserCircle },
];

interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminMobileDrawer({ isOpen, onClose }: AdminMobileDrawerProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)] shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header drawer */}
        <div
          className="flex items-center justify-between px-5 border-b border-[var(--color-border)] shrink-0"
          style={{ height: "var(--nav-height)" }}
        >
          <span className="font-display font-bold text-base text-[var(--color-text)]">
            GymKit{" "}
            <span className="text-xs text-[var(--color-accent)] font-normal">
              admin
            </span>
          </span>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-raised)] transition-all"
            aria-label="Chiudi menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {adminNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
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

        {/* Footer: tema + logout */}
        <div className="px-3 pb-6 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--color-surface-raised)] rounded-xl border border-[var(--color-border)]">
            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
              Tema
            </span>
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
      </div>
    </>
  );
}
