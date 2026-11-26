"use client";

import { motion } from "framer-motion";
import { territoryAngle, type Territory } from "@/lib/astray/territories";

type Ghost = { text: string; territory?: Territory };

/** Where the hole's vanishing point sits, in % of the stage (matches FallView). */
const VANISH = { x: 50, y: 48 };

/** A ghost's direction: its territory's place on the compass, or a spread-out fallback. */
const angleOf = (g: Ghost, i: number) => (g.territory ? territoryAngle(g.territory) : i * 2.4);

/**
 * Astray, made visible. While the field of candidates streams in they hover faintly round the
 * hole; once the hole has chosen, the ones it turned down (the ones most like you) are struck
 * through and flung back into the walls on the side of their territory.
 */
export function AstrayGhosts({ live, passedOver, reduce }: { live: Ghost[]; passedOver: Ghost[]; reduce: boolean }) {
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {live.map((g, i) => {
        const angle = angleOf(g, i);
        // Spread same-territory candidates over a few rings so they don't stack.
        const radius = 15 + (i % 3) * 7;
        return (
          <motion.span
            key={`live:${g.text}`}
            className="absolute w-[34vw] max-w-[14rem] -translate-x-1/2 -translate-y-1/2 text-center font-display text-xs text-soft/40 italic sm:text-sm"
            style={{ left: `${VANISH.x + Math.cos(angle) * radius}%`, top: `${VANISH.y + Math.sin(angle) * radius * 0.8}%` }}
            initial={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
            animate={{ opacity: 0.6, scale: 1, filter: "blur(1px)" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {g.text}
          </motion.span>
        );
      })}

      {passedOver.map((g, i) => {
        const angle = angleOf(g, i);
        const from = { x: VANISH.x + Math.cos(angle) * 14, y: VANISH.y + Math.sin(angle) * 11 };
        const to = { x: VANISH.x + Math.cos(angle) * 70, y: VANISH.y + Math.sin(angle) * 56 };
        return (
          <motion.span
            key={`gone:${g.text}`}
            className="absolute w-[34vw] max-w-[14rem] -translate-x-1/2 -translate-y-1/2 text-center font-display text-xs text-soft/70 line-through decoration-lavender/70 sm:text-sm"
            initial={{ left: `${from.x}%`, top: `${from.y}%`, opacity: 0, scale: 0.8, filter: "blur(0px)" }}
            animate={{
              left: [`${from.x}%`, `${from.x}%`, `${to.x}%`],
              top: [`${from.y}%`, `${from.y}%`, `${to.y}%`],
              opacity: [0, 0.75, 0],
              scale: [0.8, 1, 1.6],
              filter: ["blur(0px)", "blur(0px)", "blur(6px)"],
            }}
            transition={{ duration: 2.6, delay: 0.2 + i * 0.12, times: [0, 0.3, 1], ease: "easeIn" }}
          >
            {g.text}
            <span className="mt-0.5 block text-[0.6rem] tracking-[0.25em] text-lavender uppercase no-underline">too you</span>
          </motion.span>
        );
      })}
    </div>
  );
}
