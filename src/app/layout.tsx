import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "GymKit",
  description: "App per la gestione della palestra",
  manifest: "/manifest.json",
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
    const supabase = await createClient();
    const { data: gym } = await supabase
      .from("gym")
      .select("primary_color, accent_color")
      .limit(1)
      .single();

    if (gym) {
      if (gym.primary_color) gymStyle["--gym-primary"] = gym.primary_color;
      if (gym.accent_color) gymStyle["--gym-accent"] = gym.accent_color;
      // Note: --gym-primary-light has no DB column; it always uses the CSS fallback value.
    }
  } catch {
    // DB not reachable — CSS fallbacks apply
  }

  return (
    <html lang="it" className="dark" style={gymStyle as CSSProperties}>
      <body className="antialiased font-body bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
