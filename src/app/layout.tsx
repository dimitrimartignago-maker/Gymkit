import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymKit",
  description: "App per la gestione della palestra",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#1A1A2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className="antialiased font-body bg-[var(--color-bg)] text-[var(--color-text)]">
        {children}
      </body>
    </html>
  );
}
