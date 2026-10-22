"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LandingCta } from "./LandingCta";

/**
 * Header for the landing page only.
 *
 * The shared `Navbar` belongs to the working app: it is sticky, has a border and
 * lists app routes. The landing page sits inside a framed panel instead, so it
 * renders this slimmer bar (brand, in-page anchor, session-aware action) and
 * leaves `Navbar` untouched.
 *
 * The CTA label follows the session so the nav never asks a signed-in visitor to
 * log in again; the dashboard gets its own explicit link because the CTA always
 * points at the new-project form. "Cara kerja" is the in-page anchor to the
 * steps section and stays visible without a session.
 */
export function LandingNav() {
  const { status } = useSession();
  const authenticated = status === "authenticated";

  return (
    <header className="landing-nav">
      <Link href="/" className="landing-nav__brand">
        <BrandMark className="w-9 h-9 rounded-[10px]" iconClassName="w-[18px] h-[18px]" />
        <span className="landing-nav__wordmark">PRD Maker</span>
      </Link>

      <nav className="landing-nav__links" aria-label="Navigasi halaman">
        <a href="#cara-kerja">Cara kerja</a>
        {authenticated && <Link href="/projects">Proyek saya</Link>}
      </nav>

      <div className="landing-nav__actions">
        <ThemeToggle />
        <LandingCta
          label={authenticated ? "Buat PRD" : "Masuk"}
          size="sm"
          variant="ink"
        />
      </div>
    </header>
  );
}
