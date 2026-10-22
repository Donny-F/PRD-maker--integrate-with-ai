"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowRight } from "lucide-react";

type LandingCtaProps = {
  label: string;
  /** Control scale: `sm` in the nav, `md` inside the prompt card, `lg` in the footer. */
  size?: "sm" | "md" | "lg";
  /** Fill: `accent` is the brand yellow, `ink` is the inverse (dark on light, light on dark). */
  variant?: "accent" | "ink";
};

/**
 * The landing page's single call to action.
 *
 * The destination depends on the session, not on the label: an authenticated
 * visitor goes straight to the new-project form, while everyone else is sent to
 * `/login` because that is the only route that can create the session the form
 * needs. The visible label is decided by the caller, which is why the nav can
 * reuse this component for both "Masuk" and "Buat PRD".
 */
export function LandingCta({ label, size = "md", variant = "accent" }: LandingCtaProps) {
  const { status } = useSession();
  const href = status === "authenticated" ? "/projects/new" : "/login";

  return (
    <Link
      href={href}
      className={`landing-cta landing-cta--${size} landing-cta--${variant}`}
    >
      <span>{label}</span>
      <ArrowRight className="landing-cta__arrow" aria-hidden />
    </Link>
  );
}
