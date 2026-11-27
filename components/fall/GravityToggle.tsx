"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODE_ORDER, MODES } from "@/lib/modes";
import type { ExplorationMode } from "@/lib/types";

const OPTIONS = MODE_ORDER.map((mode) => ({ mode, ...MODES[mode] }));

/** Flips the direction of the fall. */
export function GravityToggle({ mode, onChange }: { mode: ExplorationMode; onChange: (mode: ExplorationMode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Direction of the fall"
      className="relative flex rounded-full border border-white/15 bg-midnight/70 p-1 backdrop-blur"
    >
      {OPTIONS.map((o) => {
        const active = o.mode === mode;
        return (
          <button
            key={o.mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.hint}
            onClick={() => !active && onChange(o.mode)}
            className={clsx(
              "relative rounded-full px-2.5 py-1.5 font-display text-[0.7rem] font-semibold tracking-[0.1em] whitespace-nowrap uppercase transition sm:px-5 sm:text-sm sm:tracking-[0.12em]",
              active ? "text-midnight" : "text-muted hover:text-soft",
            )}
          >
            {active ? (
              <motion.span
                layoutId="gravity-pill"
                className={clsx("absolute inset-0 rounded-full", o.pillClass)}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            ) : null}
            <span className="relative">
              <span className="hidden sm:inline">{o.glyph} </span>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
