import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { SwUnregister } from "@/components/SwUnregister";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "GymKit",
  description: "App per la gestione della palestra",
  manifest: "/manifest.json",
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#1A1A2E",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gymStyle: Record<string, string> = {};

  try {
    const supabase = createAdminClient();
    const { data: gym } = await supabase
      .from("gym")
      .select("primary_color, accent_color")
      .limit(1)
      .single();

    if (gym?.accent_color) gymStyle["--gym-accent"] = gym.accent_color;
  } catch {
    // DB not reachable — CSS fallbacks apply
  }

  return (
    <html lang="it" className="dark" style={gymStyle as CSSProperties}>
      <body className="antialiased font-body bg-[var(--color-bg)] text-[var(--color-text)]">
        {process.env.NODE_ENV !== "production" && <SwUnregister />}
        {children}
      </body>
    </html>
  );
}
