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
  { key: "prompt", label: "Prompt" },
  { key: "prd", label: "PRD" },
  { key: "diagram", label: "Diagram" },
];

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
        Prompt. PRD. Diagram.
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
          <PromptPreview />
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
