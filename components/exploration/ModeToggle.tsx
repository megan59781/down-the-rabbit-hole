"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { ExplorationMode } from "@/lib/types";

type ModeToggleProps = {
  mode: ExplorationMode;
  onChange: (mode: ExplorationMode) => void;
  disabled?: boolean;
};

export function ModeToggle({ mode, onChange, disabled }: ModeToggleProps) {
  return (
    <div role="radiogroup" aria-label="Exploration direction" className="relative flex rounded-full border border-white/10 bg-midnight-2/80 p-1">
      {(["deeper", "stranger"] as const).map((m) => {
        const active = m === mode;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(m)}
            className={clsx(
              "relative rounded-full px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition sm:px-4",
              active ? "text-midnight" : "text-muted hover:text-soft",
            )}
          >
            {active ? (
              <motion.span
                layoutId="mode-pill"
                className={clsx("absolute inset-0 rounded-full", MODES[m].bg)}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              />
            ) : null}
            <span className="relative">{m === "deeper" ? "Deeper" : "Stranger"}</span>
          </button>
        );
      })}
    </div>
  );
}
