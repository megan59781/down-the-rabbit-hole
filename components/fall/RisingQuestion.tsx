"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { QuestionNode } from "@/lib/types";
import { VANISH } from "./stage";

type RisingQuestionProps = {
  node: QuestionNode;
  slot: { x: number; y: number };
  index: number;
  /** Phones: sit in the stacked layout and move relative to that place, instead of across the screen. */
  flow?: boolean;
  /** The question the tour points at. */
  tour?: boolean;
  state: "idle" | "chosen" | "passed";
  reduce: boolean;
  onGrab: () => void;
};

/** A question floating up out of the hole. Grab it and you fall into it; the rest rush past. */
export function RisingQuestion({ node, slot, index, flow, tour, state, reduce, onGrab }: RisingQuestionProps) {
  const glow = MODES[node.mode].rgb;
  // In the phone stack, "towards the centre" is a direction from wherever this question sits.
  const toCentre = { x: index % 2 ? -1 : 1, y: index < 2 ? 1 : -1 };
  const flowTarget =
    state === "chosen"
      ? { x: toCentre.x * 70, y: toCentre.y * 110, scale: 1.5, opacity: 0 }
      : state === "passed"
        ? { x: -toCentre.x * 60, y: -toCentre.y * 140, scale: 2.2, opacity: 0 }
        : { x: 0, y: 0, scale: 1, opacity: reduce ? 1 : [0, 0, 1] };
  const target = flow
    ? flowTarget
    : state === "chosen"
      ? { left: `${VANISH.x}%`, top: `${VANISH.y}%`, scale: 1.5, opacity: 0 }
      : state === "passed"
        ? {
            left: `${VANISH.x + (slot.x - VANISH.x) * 2.4}%`,
            top: `${VANISH.y + (slot.y - VANISH.y) * 2.4}%`,
            scale: 2.2,
            opacity: 0,
          }
        : // Stay invisible for the first half of the rise so questions never pile up over the centre.
          { left: `${slot.x}%`, top: `${slot.y}%`, scale: 1, opacity: reduce ? 1 : [0, 0, 1] };

  return (
    <motion.button
      type="button"
      onClick={onGrab}
      disabled={state !== "idle"}
      initial={
        flow
          ? reduce
            ? { opacity: 0 }
            : { x: toCentre.x * 70, y: toCentre.y * 110, scale: 0.15, opacity: 0 }
          : reduce
            ? { left: `${slot.x}%`, top: `${slot.y}%`, opacity: 0 }
            : {
                // Emerge a little way out from the vanishing point, already heading for its own spot.
                left: `${VANISH.x + (slot.x - VANISH.x) * 0.25}%`,
                top: `${VANISH.y + (slot.y - VANISH.y) * 0.25}%`,
                scale: 0.15,
                opacity: 0,
              }
      }
      animate={target}
      transition={
        state === "idle"
          ? {
              duration: reduce ? 0.3 : 1.6,
              delay: reduce ? 0 : 0.15 + index * 0.25,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: reduce ? 0.3 : 1.6, delay: reduce ? 0 : 0.15 + index * 0.25, times: [0, 0.35, 1] },
            }
          : { duration: 0.6, ease: "easeIn" }
      }
      whileHover={state === "idle" ? { scale: 1.07 } : undefined}
      data-tour={tour ? "rising" : undefined}
      className={clsx(
        "group z-10 text-center focus-visible:outline-none",
        flow
          ? // Its own column and row; the diagonal offsets keep the stagger of the wide layout.
            clsx(
              "relative row-start-1 w-full",
              index % 2 ? "col-start-2" : "col-start-1",
              // Tighter on short phones, so the whole stack fits without scrolling.
              index === 0 && "mb-10 [@media(max-height:720px)]:mb-4",
              index === 3 && "mt-10 [@media(max-height:720px)]:mt-4",
            )
          : "absolute w-[44vw] max-w-[19rem] -translate-x-1/2 -translate-y-1/2",
      )}
    >
      {/* A slow, lazy drift: a small figure-of-eight with a gentle breath, offset per question. */}
      <motion.span
        className="relative block"
        animate={
          reduce
            ? undefined
            : {
                // Gentler in the phone stack, so a drifting question never reaches its neighbour.
                x: [0, 10, 0, -10, 0].map((v) => (index % 2 ? -v : v) * (flow ? 0.4 : 1)),
                y: [0, -9, 0, 9, 0].map((v) => v * (flow ? 0.4 : 1)),
                rotate: [0, index % 2 ? 1.5 : -1.5, 0, index % 2 ? -1 : 1, 0],
                scale: [1, 1.03, 1, 1.02, 1],
              }
        }
        transition={{ duration: 9 + index * 1.3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Soft darkness behind the words so the tunnel lines never cut through them. */}
        <span
          aria-hidden
          className="absolute -inset-x-6 -inset-y-5 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(10_8_18/0.88),rgb(10_8_18/0.55)_60%,transparent)]"
        />
        <span
          className="block font-display text-base leading-snug font-medium text-white transition group-focus-visible:underline max-sm:[@media(max-height:720px)]:text-sm sm:text-xl"
          style={{
            textShadow: `0 1px 3px rgb(10 8 18 / 0.9), 0 0 22px rgb(${glow} / 0.45)`,
          }}
        >
          <span aria-hidden style={{ color: `rgb(${glow})` }}>
            ?{" "}
          </span>
          {node.text}
        </span>
        {node.whisper ? (
          <span
            className="mt-1.5 block text-xs text-soft/75 italic transition group-hover:text-soft sm:text-sm"
            style={{ textShadow: "0 1px 3px rgb(10 8 18 / 0.9)" }}
          >
            {node.whisper}
          </span>
        ) : null}
      </motion.span>
    </motion.button>
  );
}
