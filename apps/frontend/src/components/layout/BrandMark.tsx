import React from "react";
import { FileCode } from "lucide-react";

type BrandMarkProps = {
  /** Tile sizing/shape classes, e.g. `w-9 h-9 rounded-lg`. */
  className?: string;
  /** Overflow classes for the glyph, e.g. `w-6 h-6`. Defaults to `w-5 h-5`. */
  iconClassName?: string;
};

/**
 * Renders the PRD Maker app tile (glyph on a rounded square).
 *
 * The mark is theme-inverted so it always keeps contrast with the page surface:
 * - light theme: solid brand-yellow tile with a dark glyph, because the original
 *   dark tile reads as a heavy black blob on white/`#fafafa` surfaces.
 * - dark theme: the original dark tile with the brand-yellow glyph.
 *
 * The glyph inherits `currentColor`, so both variants are driven by the tile's
 * `text-*` utility alone.
 */
export function BrandMark({ className = "", iconClassName = "w-5 h-5" }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 bg-brand text-neutral-950 shadow-sm ring-1 ring-black/5 dark:bg-neutral-900 dark:text-brand dark:ring-neutral-700 ${className}`}
    >
      <FileCode className={iconClassName} />
    </span>
  );
}
