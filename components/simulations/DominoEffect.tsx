"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { TemplateProps } from "./types";

export function DominoEffect({ simulation, applied, onApply, mode }: TemplateProps) {
  const dominoes = [...simulation.elements].sort((a, b) => a.x - b.x);
  const removed = new Set(applied.filter((i) => i.action === "remove").map((i) => i.targetId));
  const triggered = applied.some((i) => i.action === "trigger");
  const firstGap = dominoes.findIndex((d) => removed.has(d.id));
  const fallsUntil = firstGap === -1 ? dominoes.length : firstGap;
  const trigger = simulation.interactions.find((i) => i.action === "trigger");

  function handleClick(id: string, index: number) {
    const remove = simulation.interactions.find((i) => i.action === "remove" && i.targetId === id);
    if (remove && !applied.includes(remove)) return onApply(remove);
    if (index === 0 && trigger && !triggered) onApply(trigger);
  }

  return (
    <div className="px-2 py-8">
      <ol className="flex flex-wrap items-end justify-center gap-x-2 gap-y-8 sm:gap-x-3">
        {dominoes.map((d, i) => {
          const isRemoved = removed.has(d.id);
          const falls = triggered && i < fallsUntil;
          return (
            <li key={d.id} className="flex items-end gap-2 sm:gap-3">
              {isRemoved ? (
                <div className="grid h-36 w-24 place-items-center rounded-xl border border-dashed border-white/20 px-2 text-center text-xs text-muted/60 sm:w-28">
                  missing link
                </div>
              ) : (
                <motion.button
                  type="button"
                  onClick={() => handleClick(d.id, i)}
                  animate={falls ? { rotate: 62, y: 18, opacity: 0.85 } : { rotate: 0, y: 0, opacity: 1 }}
                  transition={{ delay: falls ? i * 0.35 : 0, type: "spring", stiffness: 90, damping: 12 }}
                  style={{ originX: 1, originY: 1 }}
                  whileHover={falls ? undefined : { rotate: 4 }}
                  className={clsx(
                    "flex h-36 w-24 items-center rounded-xl border bg-midnight-2 px-2 text-center text-xs leading-snug text-soft sm:w-28 sm:text-sm",
                    i === 0 && !triggered ? clsx(MODES[mode].border, MODES[mode].glow) : "border-white/15",
                  )}
                >
                  <span className="w-full">{d.label}</span>
                </motion.button>
              )}
              {i < dominoes.length - 1 ? (
                <span aria-hidden className="mb-16 text-muted/40">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-center text-sm text-muted">
        {triggered
          ? fallsUntil < dominoes.length
            ? "The chain stopped at the missing link."
            : "Everything fell."
          : "Tap the first domino to start the chain, or remove one first."}
      </p>
    </div>
  );
}
