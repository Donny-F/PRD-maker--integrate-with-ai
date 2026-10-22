import React from "react";
import { Inter } from "next/font/google";
import "./landing.css";

/**
 * Inter is loaded here rather than in the root layout so the working app keeps
 * its system stack and only the landing page pays for the webfont.
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-landing",
});

/**
 * Shell for the marketing route group (currently just `/`).
 *
 * The root layout owns only `<html>`, `<body>` and the providers; this group adds
 * the full-bleed `<main>`, the landing stylesheet and the font variable. That is
 * why the page can draw its own frame instead of inheriting the app's
 * `max-w-7xl` column.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className={`${inter.variable} landing-root`}>{children}</main>;
}
