import Link from "next/link";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <main className="flex-1 pb-[var(--bottom-bar-height)]">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-[var(--color-surface)] border-t border-white/10"
        style={{ height: "var(--bottom-bar-height)" }}
      >
        <Link
          href="/workout"
          className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          {/* Icona Scheda */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span className="text-[10px] font-medium">Scheda</span>
        </Link>

        <Link
          href="/booking"
          className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          {/* Icona Booking */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="text-[10px] font-medium">Booking</span>
        </Link>

        <Link
          href="/workout"
          className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          {/* Icona Log */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className="text-[10px] font-medium">Log</span>
        </Link>

        <Link
          href="/profile"
          className="flex flex-col items-center gap-1 min-w-[48px] min-h-[48px] justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
        >
          {/* Icona Profilo */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="text-[10px] font-medium">Profilo</span>
        </Link>
      </nav>
    </div>
  );
}
