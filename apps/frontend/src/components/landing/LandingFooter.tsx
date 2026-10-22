import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";

/**
 * Closing band of the landing page.
 *
 * Two pieces only: the brand and the copyright. The in-page anchors and app
 * links that used to live here were removed deliberately — the nav already
 * carries every destination, and repeating them at the bottom made the quiet
 * last screen noisy.
 *
 * The year is computed on the server, so the build stamps it.
 */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <Link href="/" className="landing-footer__brand">
          <BrandMark className="w-6 h-6 rounded-md" iconClassName="w-3 h-3" />
          <span>PRD Maker</span>
        </Link>

        <p className="landing-footer__legal">© {year} PRD Maker, GADON.</p>
      </div>
    </footer>
  );
}
