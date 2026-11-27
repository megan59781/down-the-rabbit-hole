import type { ExplorationMode } from "@/lib/types";

/** Where the hole's vanishing point sits, in % of the stage. */
export const VANISH = { x: 50, y: 48 };

/** How long the plunge into a grabbed question takes before the next level opens. */
export const DIVE_MS = 650;

/**
 * Resting spots for the rising questions on wider screens; Stranger and Astray tilt the
 * arrangement off-axis, opposite ways. Phones use a stacked layout instead (see FallView).
 */
export function slotsFor(mode: ExplorationMode) {
  const base = [
    [21, 22],
    [79, 25],
    [19, 73],
    [81, 71],
  ];
  if (mode === "deeper") return base.map(([x, y]) => ({ x, y }));
  const angle = ((mode === "stranger" ? -13 : 11) * Math.PI) / 180;
  return base.map(([x, y]) => {
    const dx = x - VANISH.x;
    const dy = y - VANISH.y;
    return {
      x: Math.min(88, Math.max(12, VANISH.x + dx * Math.cos(angle) - dy * Math.sin(angle))),
      y: Math.min(90, Math.max(10, VANISH.y + dx * Math.sin(angle) + dy * Math.cos(angle))),
    };
  });
}
