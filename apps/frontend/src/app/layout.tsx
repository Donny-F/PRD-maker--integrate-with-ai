import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "PRD Maker — Prompt. PRD. Diagram.",
  description:
    "Satu prompt menghasilkan PRD siap review dan diagram alur otomatis. Klarifikasi AI, PRD ter-stream, dan riwayat versi dalam satu proyek.",
};

const themeInitScript = `(function(){try{var stored=localStorage.getItem("prd-maker-theme");var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",dark);document.documentElement.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

/**
 * Root document only: theme boot, providers and the `<body>` flex column.
 *
 * Chrome (navbar + constrained `<main>`) belongs to `(app)/layout.tsx`, and the
 * full-bleed landing frame belongs to `(marketing)/layout.tsx`. Keeping the root
 * neutral is what lets the landing page fill the viewport without changing any
 * URL.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
