"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { MODES } from "@/lib/modes";
import type { QuestionNode } from "@/lib/types";

/**
 * Long questions (often the first one, or an answer to the rabbit) step down a size so they never
 * crowd the questions around them. Short phones (e.g. iPhone SE) go one size smaller again.
 */
export function heldSize(text: string) {
  return text.length > 160
    ? "text-lg max-sm:[@media(max-height:720px)]:text-base sm:text-2xl"
    : text.length > 80
      ? "text-xl max-sm:[@media(max-height:720px)]:text-lg sm:text-3xl"
      : "text-2xl max-sm:[@media(max-height:720px)]:text-xl sm:text-4xl";
}

/** The question you're holding, at the heart of the hole (or your own words to the rabbit). */
export function HeldQuestion({
  focus,
  depth,
  narrow,
  reduce,
}: {
  focus: QuestionNode;
  depth: number;
  narrow: boolean;
  reduce: boolean;
}) {
  const size = heldSize(focus.answer ?? focus.text);
  const glow = { textShadow: `0 0 30px rgb(${MODES[focus.mode].rgb} / 0.35)` };
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={focus.id}
        data-tour="held"
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.6, filter: "blur(12px)" }}
        transition={{ duration: reduce ? 0.2 : 0.7, ease: "easeOut" }}
        className="max-w-[80vw] text-center sm:max-w-xl"
        style={narrow ? undefined : { marginTop: "-4dvh" }}
      >
        {focus.answer !== undefined ? (
          <>
            {/* Your own words, held like any question: they only ever grow more questions. */}
            <p className="mx-auto max-w-md text-xs text-muted italic">
              <RabbitIcon className="mr-1 inline h-4 w-4 align-[-3px] text-lavender" />
              {focus.text}
            </p>
            <h1 className={clsx("mt-3 font-serif leading-tight text-soft", size)} style={glow}>
              &ldquo;{focus.answer}&rdquo;
            </h1>
            <p className="mt-2 text-[0.65rem] tracking-[0.3em] text-muted uppercase">You told the rabbit</p>
          </>
        ) : (
          <>
            <p className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">
              {depth === 0 ? "You're holding" : `${depth} down · you're holding`}
            </p>
            <h1 className={clsx("mt-3 font-serif leading-tight text-soft", size)} style={glow}>
              {focus.text}
            </h1>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
