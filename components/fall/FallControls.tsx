"use client";

import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { ExplorationMode } from "@/lib/types";

type FallControlsProps = {
  className: string;
  mode: ExplorationMode;
  /** Questions currently rising, and whether more are on their way. */
  risingCount: number;
  growing: boolean;
  error?: string;
  hasDived: boolean;
  /** Offer the tour (only on the first question of a fresh fall). */
  offerTour: boolean;
  /** Astray: the rabbit naming the habits it's working against. */
  habitLine: string | null;
  onRetry: () => void;
  onMore: () => void;
  onTour: () => void;
  onDeclineTour: () => void;
};

/** Status and controls along the bottom of the fall. */
export function FallControls({
  className,
  mode,
  risingCount,
  growing,
  error,
  hasDived,
  offerTour,
  habitLine,
  onRetry,
  onMore,
  onTour,
  onDeclineTour,
}: FallControlsProps) {
  return (
    <div className={className}>
      {offerTour ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5 }}
          className="pointer-events-auto flex items-center gap-1 rounded-full border border-lavender/40 bg-midnight/80 py-1 pr-1 pl-4 text-sm text-soft backdrop-blur"
        >
          First time down here?
          <button
            type="button"
            onClick={onTour}
            className="rounded-full bg-lavender px-3 py-1 font-display text-xs font-semibold text-midnight hover:bg-soft"
          >
            Take the tour
          </button>
          <button
            type="button"
            aria-label="Not now"
            onClick={onDeclineTour}
            className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-soft"
          >
            ×
          </button>
        </motion.div>
      ) : null}
      {error ? (
        <p role="alert" className="pointer-events-auto text-sm text-pink">
          {error}{" "}
          <button type="button" onClick={onRetry} className="underline underline-offset-4">
            Try again
          </button>
        </p>
      ) : growing && risingCount === 0 ? (
        <p className="text-sm text-muted italic animate-pulse">{MODES[mode].rising}</p>
      ) : mode === "astray" && risingCount > 0 && !growing ? (
        <p className="text-xs text-lavender/90">{habitLine ?? "Learning what you reach for, so it can lead you elsewhere."}</p>
      ) : !hasDived && risingCount > 0 ? (
        <p className="text-xs text-muted/80">Tap a question to fall into it · scroll to fall faster</p>
      ) : null}
      {risingCount > 0 && !growing ? (
        <button
          type="button"
          onClick={onMore}
          className="pointer-events-auto rounded-full border border-white/10 bg-midnight/50 px-3 py-1 text-xs text-muted backdrop-blur hover:text-soft"
        >
          ↻ Let others rise
        </button>
      ) : null}
    </div>
  );
}
