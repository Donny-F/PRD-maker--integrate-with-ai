import React from "react";
import { Navbar } from "@/components/layout/Navbar";

/**
 * Shell for the working app (projects, admin, login).
 *
 * The root layout owns the document providers and the app stylesheet; this
 * group draws the studio frame: a plain sticky header, the 1320px work canvas
 * and a quiet closing line. The landing page keeps its own full-bleed frame in
 * the sibling `(marketing)` group.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">{children}</main>
      <footer className="app-footer">
        <span className="app-footer__brand">PRD Maker</span>
        <span>Prompt menjadi PRD, diagram, dan riwayat versi.</span>
      </footer>
    </div>
  );
}
