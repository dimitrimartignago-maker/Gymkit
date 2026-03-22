"use client";

import { BookOpen, CalendarDays, CheckSquare, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/workout",
    label: "Scheda",
    icon: BookOpen,
  },
  {
    href: "/booking",
    label: "Booking",
    icon: CalendarDays,
  },
  {
    href: "/log",
    label: "Log",
    icon: CheckSquare,
  },
  {
    href: "/profile",
    label: "Profilo",
    icon: User,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] border-t border-white/10"
      style={{ height: "var(--bottom-bar-height)" }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] flex-1 transition-colors",
              active
                ? "text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text)]",
            ].join(" ")}
          >
            <Icon size={24} strokeWidth={active ? 2.5 : 2} />
            <span className={["text-[10px] font-medium", active ? "font-semibold" : ""].join(" ")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
