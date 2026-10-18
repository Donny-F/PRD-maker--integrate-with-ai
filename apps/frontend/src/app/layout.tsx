import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "PRD Maker - Generator Dokumen & Diagram PRD AI",
  description:
    "Aplikasi pembuat Product Requirements Document (PRD) dan visualisasi bagan diagram alur menggunakan LLM Antigravity & DeepSeek.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col font-sans">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
