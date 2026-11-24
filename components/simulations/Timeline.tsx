"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { MODES } from "@/lib/modes";
import type { TemplateProps } from "./types";

export function Timeline({ simulation, applied, onApply, mode }: TemplateProps) {
  const [focused, setFocused] = useState<string | null>(null);

  const removed = new Set(applied.filter((i) => i.action === "remove").map((i) => i.targetId));
  const revealed = applied.some((i) => i.action === "reveal");
  let ordered = [...simulation.elements].sort((a, b) => a.x - b.x);
  for (const i of applied) {
    if (i.action !== "reorder" || !i.targetId) continue;
    const target = ordered.find((e) => e.id === i.targetId);
    if (target) ordered = [target, ...ordered.filter((e) => e.id !== target.id)];
  }
  const visible = ordered.filter((e) => !removed.has(e.id));

  function handleClick(id: string) {
    const interaction = simulation.interactions.find(
      (i) => i.targetId === id && !applied.some((a) => a.id === i.id),
    );
    if (interaction) onApply(interaction);
    else setFocused((f) => (f === id ? null : id));
  }

  return (
    <div className="relative px-2 py-6 sm:px-4 sm:py-10">
      {/* The time axis */}
      <div
        aria-hidden
        className={clsx(
          "absolute top-6 bottom-6 left-[1.125rem] w-px bg-gradient-to-b sm:top-[3.375rem] sm:right-6 sm:bottom-auto sm:left-6 sm:h-px sm:w-auto sm:bg-gradient-to-r",
          "from-transparent via-white/25 to-transparent",
        )}
      />
      <ol className="relative flex flex-col gap-5 sm:flex-row sm:gap-3">
        <AnimatePresence mode="popLayout">
          {visible.map((el, i) => {
            const targetable = simulation.interactions.some(
              (x) => x.targetId === el.id && !applied.some((a) => a.id === x.id),
            );
            const showSetBy = revealed || focused === el.id;
            return (
              <motion.li
                key={el.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
                transition={{ type: "spring", stiffness: 140, damping: 18, delay: i * 0.05 }}
                className="flex flex-1 items-start gap-4 sm:flex-col sm:items-center sm:text-center"
              >
                <button
                  type="button"
                  onClick={() => handleClick(el.id)}
                  aria-label={`Milestone: ${el.label}`}
                  className={clsx(
                    "relative z-10 mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 bg-midnight transition sm:mt-0 sm:h-7 sm:w-7",
                    MODES[mode].border,
                    targetable && "animate-pulse",
                  )}
                >
                  <span className={clsx("h-2 w-2 rounded-full", MODES[mode].bg)} />
                </button>
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
                  className="min-w-0 sm:px-1"
                >
                  <p className="text-sm font-medium text-soft sm:text-[0.95rem]">{el.label}</p>
                  <AnimatePresence>
                    {showSetBy && el.properties.setBy ? (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className={clsx("mt-1 text-xs", MODES[mode].text)}
                      >
                        set by: {String(el.properties.setBy)}
                      </motion.p>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {removed.size > 0 ? (
        <p className="mt-6 text-center text-xs text-muted/70 italic">
          {removed.size === 1 ? "A milestone has been removed." : `${removed.size} milestones removed.`} The
          timeline closed the gap.
        </p>
      ) : null}
    </div>
  );
}
