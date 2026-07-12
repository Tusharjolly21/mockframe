import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "MockFrame — Screenshot Mockup Studio",
  description:
    "Place screenshots in pixel-accurate device and browser frames, style the scene, and export production-quality images.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* crossOrigin makes cssRules readable so the client exporter can inline @font-face */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (ColorZilla's
          cz-shortcut-listen, Grammarly, etc.) mutate <body> before React
          hydrates — this silences that attribute-only noise, nothing else. */}
      <body className="bg-zinc-950 text-zinc-200 antialiased" suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
