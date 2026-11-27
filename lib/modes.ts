import type { ExplorationMode } from "@/lib/types";

/**
 * Everything about the three directions of the fall, in one place: what they're called, how
 * they look and what they say. Components and the share cards read from here, so a direction
 * can be renamed or recoloured without hunting through the app.
 *
 * Tailwind classes are written out in full (not built from parts) so Tailwind can find them.
 */
export type ModeStyle = {
  label: string;
  glyph: string;
  /** Tooltip on the direction toggle. */
  hint: string;
  /** The colour as hex (canvas) and as an "r g b" triplet (CSS rgb() with alpha). */
  hex: string;
  rgb: string;
  textClass: string;
  pillClass: string;
  /** Shown while the first questions of a set are on their way. */
  rising: string;
};

export const MODES: Record<ExplorationMode, ModeStyle> = {
  deeper: {
    label: "Deeper",
    glyph: "↓",
    hint: "Fall straight down: assumptions, causes, what's underneath",
    hex: "#9ccbff",
    rgb: "156 203 255",
    textClass: "text-ice",
    pillClass: "bg-ice",
    rising: "Questions are rising from below…",
  },
  stranger: {
    label: "Stranger",
    glyph: "✦",
    hint: "Gravity tips sideways: other worlds, odd angles",
    hex: "#e5a2e8",
    rgb: "229 162 232",
    textClass: "text-pink",
    pillClass: "bg-pink",
    rising: "Something strange is drifting in…",
  },
  astray: {
    label: "Astray",
    glyph: "⇝",
    hint: "Away from your habits: the hole learns what you pick and leads you elsewhere",
    hex: "#b79aff",
    rgb: "183 154 255",
    textClass: "text-lavender",
    pillClass: "bg-lavender",
    rising: "Turning away from your usual paths…",
  },
};

/** The order they appear in the toggle. */
export const MODE_ORDER: readonly ExplorationMode[] = ["deeper", "stranger", "astray"];
