import { GitBranch, Maximize2, Minus, Plus } from "lucide-react";

/**
 * The flow diagram artefact.
 *
 * Geometry note: the SVG overlay is stretched to the canvas (`preserveAspectRatio="none"`,
 * viewBox `0 0 360 298`) while the nodes are placed in percentages of the same box.
 * Every path endpoint therefore matches the node edges by construction:
 * - the epic spans `left: 4%` + `width: 30%`, so its right edge is at 34% = x 122 of 360;
 * - the feature column starts at `left: 58%` = x 209;
 * - node centres sit at `top: 22% / 50% / 78%` of 298px = y 66 / 149 / 232.
 * Change one of those numbers and the matching path has to change with it.
 */
export function DiagramPreview() {
  return (
    <article className="landing-card landing-card--flow" data-ui aria-label="Contoh bagan alur">
      <header className="landing-card__head">
        <GitBranch className="landing-card__icon" aria-hidden />
        <span className="landing-card__file">Bagan alur</span>
        <span className="landing-chip">Contoh</span>
      </header>

      <div className="flow-canvas">
        <svg
          className="flow-edges"
          viewBox="0 0 360 298"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path className="flow-line" d="M122 149 C 165 149 166 66 209 66" />
          <path className="flow-line" d="M122 149 L 209 149" />
          <path className="flow-line" d="M122 149 C 165 149 166 232 209 232" />
        </svg>

        <div className="flow-node flow-node--epic">
          <span className="flow-node__label">Epic (root)</span>
          <span className="flow-node__title">Marketplace B2B</span>
        </div>

        <div className="flow-node flow-node--feature flow-node--top">
          <span className="flow-node__row">
            <span className="flow-node__label">Fitur</span>
            <span className="flow-phase">Fase 1</span>
          </span>
          <span className="flow-node__title">Katalog</span>
        </div>

        <div className="flow-node flow-node--feature flow-node--mid">
          <span className="flow-node__row">
            <span className="flow-node__label">Fitur</span>
            <span className="flow-phase">Fase 2</span>
          </span>
          <span className="flow-node__title">Pesanan</span>
        </div>

        <div className="flow-node flow-node--feature flow-node--bottom">
          <span className="flow-node__row">
            <span className="flow-node__label">Fitur</span>
            <span className="flow-phase">Fase 1</span>
          </span>
          <span className="flow-node__title">Logistik</span>
        </div>
      </div>
    </article>
  );
}
