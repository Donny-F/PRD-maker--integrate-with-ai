import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingNav } from "@/components/landing/LandingNav";

/**
 * Landing page: frame + statement + three artefacts, then how it works, then the
 * closing field.
 *
 * The shell/panel pair is the reference's signature shape: the panel is inset
 * from the page ground by `--shell-pad` and its top corners are scooped out (see
 * `landing.css`). Only the panel holds the nav and the hero; the sections below
 * sit directly on the ground so the page does not read as one long card.
 */
export default function LandingPage() {
  return (
    <>
      <div className="landing-panel">
        <LandingNav />
        <LandingHero />
      </div>
      <HowItWorks />
      <LandingFooter />
    </>
  );
}
