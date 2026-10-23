import "./globals.css";
import "./app-ui.css";
import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

/**
 * The app and the marketing page share one typeface. Loading it at the root
 * keeps the working screens from falling back to the platform UI stack while
 * the landing page keeps its own `--font-landing` alias in `(marketing)/layout`.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-app",
});

export const metadata: Metadata = {
  title: "PRD Maker — Prompt, PRD, Diagram",
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
      <body className={`${inter.variable} min-h-screen font-sans`}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
