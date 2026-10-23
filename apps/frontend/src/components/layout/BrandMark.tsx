import React from "react";
import { FileCode } from "lucide-react";

type BrandMarkProps = {
  /** Tile sizing/shape classes, e.g. `w-9 h-9 rounded-lg`. */
  className?: string;
  /** Glyph sizing classes. Defaults to `w-5 h-5`. */
  iconClassName?: string;
};

/**
 * The product tile: the document glyph on the brand-yellow square.
 *
 * The landing navigation sets the size; the app shell reuses it unchanged so
 * the mark has one colour in both light and dark themes.
 */
export function BrandMark({ className = "", iconClassName = "w-5 h-5" }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center bg-brand text-neutral-950 ${className}`}
    >
      <FileCode className={iconClassName} />
    </span>
  );
}
