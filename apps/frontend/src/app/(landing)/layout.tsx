import React from "react";
import "./landing.css";

/**
 * Shell for the marketing route group (currently just `/`).
 *
 * The root layout owns the document, the providers and the shared Inter face;
 * this group adds the full-bleed `<main>` and the landing stylesheet. That is
 * why the page can draw its own frame instead of inheriting the app's
 * `max-w-7xl` column.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="landing-root">{children}</main>;
}
