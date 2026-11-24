"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import { MODE_STROKE, type TemplateProps } from "./types";

export function BranchingPaths({ simulation, applied, onApply, mode }: TemplateProps) {
  const start = simulation.elements.find((e) => e.type === "person") ?? simulation.elements[0];
  const destinations = simulation.elements.filter((e) => e.id !== start.id);
  const selectedId = [...applied].reverse().find((i) => i.action === "select")?.targetId;
  const selected = destinations.find((d) => d.id === selectedId);
  const stroke = MODE_STROKE[mode];

  return (
    <div className="px-2 py-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-3xl sm:aspect-[2/1]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {destinations.map((d, i) => {
            const sy = start.y + 8;
            const dy = d.y - 8;
            const mid = (dy - sy) / 2;
            const path = `M${start.x} ${sy} C${start.x} ${sy + mid} ${d.x} ${dy - mid} ${d.x} ${dy}`;
            const isSelected = d.id === selectedId;
            const dimmed = selectedId && !isSelected;
            return (
              <g key={d.id}>
                <motion.path
                  d={path}
                  fill="none"
                  stroke={isSelected ? stroke : "rgb(242 239 248 / 0.25)"}
                  strokeWidth={isSelected ? 2.5 : 1.2}
                  vectorEffect="non-scaling-stroke"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dimmed ? 0.25 : 1 }}
                  transition={{ duration: 0.8, delay: i * 0.2, ease: "easeOut" }}
                />
                {/* Travelling sparks along each path */}
                <path
                  d={path}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isSelected ? 3 : 1.5}
                  strokeLinecap="round"
                  strokeDasharray="1 14"
                  vectorEffect="non-scaling-stroke"
                  opacity={dimmed ? 0 : isSelected ? 0.9 : 0.35}
                  className="[animation:dash_3s_linear_infinite] motion-reduce:[animation:none]"
                />
              </g>
            );
          })}
        </svg>

        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-midnight px-4 py-2 font-display text-sm text-soft shadow-[0_0_30px_-8px_rgb(183_154_255/0.6)]"
          style={{ left: `${start.x}%`, top: `${start.y}%` }}
        >
          {start.label}
        </div>

        {destinations.map((d) => {
          const interaction = simulation.interactions.find((i) => i.targetId === d.id);
          const isSelected = d.id === selectedId;
          return (
            <motion.button
              key={d.id}
              type="button"
              disabled={!interaction}
              onClick={() => interaction && onApply(interaction)}
              whileHover={{ scale: 1.05 }}
              className={clsx(
                "absolute w-[30%] max-w-48 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-2 py-2 text-xs text-soft transition sm:px-3 sm:text-sm",
                isSelected
                  ? clsx(MODES[mode].border, "bg-midnight-2", MODES[mode].glow)
                  : "border-white/15 bg-midnight/90 hover:border-white/40",
                selectedId && !isSelected && "opacity-50",
              )}
              style={{ left: `${d.x}%`, top: `${d.y}%` }}
            >
              {d.label}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        {selected ? `You followed “${selected.label}”. Try another path.` : "Choose a destination to follow its path."}
      </p>
    </div>
  );
}
