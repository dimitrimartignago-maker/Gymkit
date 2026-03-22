export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-text)]">
            Gym<span className="text-[var(--color-accent)]">Kit</span>
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
