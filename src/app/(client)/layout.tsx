import { BottomNav } from "@/components/ui";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <main className="flex-1 pb-[var(--bottom-bar-height)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
