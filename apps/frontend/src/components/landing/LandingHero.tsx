"use client";

import { useState } from "react";
import { DiagramPreview } from "./DiagramPreview";
import { PrdPreview } from "./PrdPreview";
import { PromptPreview } from "./PromptPreview";

/**
 * The three artefacts, in the order the product produces them.
 *
 * `key` doubles as the CSS hook: the wrapper of each card carries
 * `data-active`, and `landing.css` does the rest. Keeping the mapping here
 * means the markup and the stylesheet cannot drift apart.
 */
type ShowcaseKey = "prompt" | "prd" | "diagram";

const SHOWCASE: ReadonlyArray<{ key: ShowcaseKey; label: string }> = [
  { key: "prd", label: "PRD" },
  { key: "prompt", label: "Prompt" },
  { key: "diagram", label: "Diagram" },
];

/**
 * The dashed arrow drawn in the gutter beside the prompt card.
 *
 * One path serves both directions: the right-hand copy is the same svg mirrored
 * by `.landing-link--right`, so the two arrows cannot fall out of sync. The
 * head sits at the left of the viewBox (x 4–8.5), i.e. the direction of travel.
 * Positioning lives in `landing.css` because it is relative to the grid gutter,
 * not to the card's content.
 */
function FlowArrow({ side }: { side: "left" | "right" }) {
  return (
    <span className={`landing-link landing-link--${side}`} aria-hidden>
      <svg viewBox="0 0 28 10" fill="none">
        <path d="M27 5H7" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        <path
          d="M8.5 1 4 5l4.5 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/**
 * First screen of the landing page.
 *
 * Interaction model: the segmented control above the artefacts spotlights one
 * card at a time. Two inputs feed the same resolved value so the control never
 * lies about what is highlighted:
 * - `hovered` is transient (pointer or keyboard focus on a segment);
 * - `pinned` is the click selection and survives until the same segment is
 *   clicked again.
 * `hovered ?? pinned` means previewing a segment temporarily overrides the
 * pin, and leaving it restores the pin. With neither set nothing is dimmed, so
 * the page still reads as the reference composition on first paint.
 *
 * DOM order is prompt, PRD, diagram (also the mobile order: the action card
 * first). The grid areas put the PRD on the left on desktop, so the same
 * markup serves both layouts without a duplicate tree.
 *
 * The wrappers carry the entrance animation and the cards inside them carry the
 * slow float, which keeps the two transforms on separate elements.
 */
export function LandingHero() {
  const [pinned, setPinned] = useState<ShowcaseKey | null>(null);
  const [hovered, setHovered] = useState<ShowcaseKey | null>(null);

  const active = hovered ?? pinned;

  const previewState = (key: ShowcaseKey) => ({
    "data-active": active === key ? "true" : "false",
  });

  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <h1 id="landing-title" className="landing-title">
        Prompt <span className="flow__arrow">→</span> PRD <span className="flow__arrow">→</span> Diagram
      </h1>
      <p className="landing-sub">
        Satu prompt sudah cukup untuk menghasilkan PRD yang siap direview, lengkap
        dengan diagram alurnya.
      </p>

      <div className="landing-showcase" role="group" aria-label="Pilih pratinjau">
        {SHOWCASE.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className="landing-showcase__step"
            aria-pressed={pinned === key}
            data-active={active === key}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(key)}
            onBlur={() => setHovered(null)}
            onClick={() => setPinned((current) => (current === key ? null : key))}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="landing-previews items-center">
        <div className="landing-preview landing-preview--prompt" {...previewState("prompt")}>
          <FlowArrow side="left" />
          <PromptPreview />
          <FlowArrow side="right" />
        </div>
        <div className="landing-preview landing-preview--prd" {...previewState("prd")}>
          <PrdPreview />
        </div>
        <div className="landing-preview landing-preview--diagram" {...previewState("diagram")}>
          <DiagramPreview />
        </div>
      </div>
    </section>
  );
}
