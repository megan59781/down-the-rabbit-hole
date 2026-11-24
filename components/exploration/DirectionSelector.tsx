"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { RabbitEars } from "@/components/branding/RabbitGuide";
import { MODES } from "@/lib/modes";
import type { ExplorationMode } from "@/lib/types";

function DeeperGlyph() {
  // Concentric layers drawing inward.
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" fill="none" stroke="currentColor" aria-hidden>
      {[52, 40, 28, 16, 6].map((r, i) => (
        <motion.circle
          key={r}
          cx="60"
          cy="60"
          r={r}
          strokeWidth={1.2}
          strokeOpacity={0.25 + i * 0.15}
          animate={{ scale: [1, 0.94, 1] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
        />
      ))}
      <path d="M60 4V40M60 80V116M4 60H40M80 60H116" strokeWidth={0.8} strokeOpacity={0.4} />
    </svg>
  );
}

function StrangerGlyph() {
  // A portal with orbiting fragments flying outward.
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" fill="none" stroke="currentColor" aria-hidden>
      <ellipse cx="60" cy="64" rx="22" ry="34" strokeWidth={1.5} transform="rotate(-18 60 64)" />
      <ellipse cx="60" cy="64" rx="14" ry="24" strokeWidth={1} strokeOpacity={0.5} transform="rotate(-18 60 64)" />
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        style={{ transformOrigin: "60px 60px", transformBox: "view-box" }}
      >
        <path d="M18 30l6 2-4 5z" strokeWidth={1.2} />
        <rect x="94" y="26" width="7" height="7" strokeWidth={1.2} transform="rotate(20 97 29)" />
        <circle cx="100" cy="92" r="3.5" strokeWidth={1.2} />
        <path d="M22 96l4-6 4 6z" strokeWidth={1.2} />
      </motion.g>
    </svg>
  );
}

type DirectionSelectorProps = {
  onChoose: (mode: ExplorationMode) => void;
};

export function DirectionSelector({ onChoose }: DirectionSelectorProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {(["deeper", "stranger"] as const).map((mode, i) => {
        const m = MODES[mode];
        return (
          <motion.button
            key={mode}
            type="button"
            onClick={() => onChoose(mode)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            whileHover={{ y: -4 }}
            className={clsx(
              "group relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-midnight-2/70 px-6 pt-10 pb-8 text-center transition-colors",
              mode === "deeper" ? "hover:border-ice/50" : "hover:border-pink/50",
              m.glow,
            )}
          >
            <RabbitEars
              className={clsx(
                "absolute -top-1 right-8 h-7 w-9 translate-y-6 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-70",
                m.text,
              )}
            />
            <span className={m.text}>{mode === "deeper" ? <DeeperGlyph /> : <StrangerGlyph />}</span>
            <span className={clsx("font-display text-2xl font-semibold tracking-[0.12em] uppercase", m.text)}>
              {m.label}
            </span>
            <span className="max-w-xs text-muted">{m.tagline}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
