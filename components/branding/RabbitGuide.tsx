"use client";

import { motion, useReducedMotion } from "framer-motion";
import { RABBIT_PATH } from "./RabbitIcon";

/** Loading state: the rabbit hops and dips into a glowing portal. */
export function RabbitLoader({ message = "Following the rabbit…" }: { message?: string }) {
  const reduce = useReducedMotion();
  return (
    <div role="status" className="flex flex-col items-center gap-5 py-16 text-center">
      <svg viewBox="0 0 80 80" className="h-24 w-24 overflow-visible" aria-hidden>
        <defs>
          <clipPath id="above-portal">
            <rect x="-20" y="-40" width="120" height="112" />
          </clipPath>
        </defs>
        <ellipse
          cx="40"
          cy="72"
          rx="26"
          ry="5"
          fill="rgb(101 68 165 / 0.35)"
          stroke="var(--color-lavender)"
          strokeWidth={1.5}
          className="animate-portal"
        />
        <g clipPath="url(#above-portal)">
          <motion.g
            animate={reduce ? undefined : { y: [0, -14, 0, 18, 18, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.45, 0.65, 0.8, 1] }}
          >
            <g transform="translate(10 12)" fill="none" stroke="var(--color-soft)" strokeWidth={2} strokeLinejoin="round">
              <path d={RABBIT_PATH} />
              <circle cx="19.5" cy="28.5" r="1.2" fill="var(--color-soft)" stroke="none" />
            </g>
          </motion.g>
        </g>
      </svg>
      <p className="font-display text-sm tracking-[0.2em] text-muted uppercase">{message}</p>
    </div>
  );
}

/** Two ears peeking over the top edge of a card. Purely decorative. */
export function RabbitEars({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <path d="M9 24C6 16 5 8 7 2C11 4 13 13 13 24" />
      <path d="M17 24C17 14 20 5 23 3C25 8 23 17 21 24" />
    </svg>
  );
}

/** A tiny rabbit footprint pair, used as a trail marker. */
export function Footprints({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="currentColor">
      <ellipse cx="5" cy="10" rx="1.6" ry="3" />
      <ellipse cx="11" cy="6" rx="1.6" ry="3" />
    </svg>
  );
}
