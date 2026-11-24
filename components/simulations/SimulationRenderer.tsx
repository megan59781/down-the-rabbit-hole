"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { ExplorationMode, Simulation, SimulationInteraction, VisualType } from "@/lib/types";
import { BranchingPaths } from "./BranchingPaths";
import { DominoEffect } from "./DominoEffect";
import { Timeline } from "./Timeline";
import type { TemplateProps } from "./types";

const TEMPLATES: Record<VisualType, (props: TemplateProps) => React.ReactNode> = {
  branching_paths: BranchingPaths,
  timeline: Timeline,
  domino_effect: DominoEffect,
};

type SimulationRendererProps = {
  simulation: Simulation;
  appliedIds: string[];
  onApply: (interaction: SimulationInteraction) => void;
  mode: ExplorationMode;
};

export function SimulationRenderer({ simulation, appliedIds, onApply, mode }: SimulationRendererProps) {
  const Template = TEMPLATES[simulation.visualType];
  const applied = appliedIds
    .map((id) => simulation.interactions.find((i) => i.id === id))
    .filter((i): i is SimulationInteraction => Boolean(i));
  const latest = applied.at(-1);
  const discoveries = simulation.discoveries.slice(0, applied.length);

  return (
    <section
      aria-label={`Simulation: ${simulation.title}`}
      className={clsx(
        "relative overflow-hidden rounded-[2rem] border border-white/10 p-4 sm:p-8",
        mode === "deeper"
          ? "bg-[radial-gradient(ellipse_at_top,rgb(156_203_255/0.10),transparent_60%),var(--color-midnight-2)]"
          : "bg-[radial-gradient(ellipse_at_top,rgb(229_162_232/0.12),transparent_60%),var(--color-midnight-2)]",
      )}
    >
      <header className="text-center">
        <p className={clsx("text-xs tracking-[0.25em] uppercase", MODES[mode].text)}>Simulation</p>
        <h2 className="mt-2 font-serif text-3xl text-soft sm:text-4xl">{simulation.title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted">{simulation.description}</p>
      </header>

      <div className="mt-4">
        <Template simulation={simulation} applied={applied} onApply={onApply} mode={mode} />
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {simulation.interactions.map((interaction) => {
          const done = appliedIds.includes(interaction.id);
          return (
            <button
              key={interaction.id}
              type="button"
              disabled={done}
              onClick={() => onApply(interaction)}
              className={clsx(
                "rounded-full border px-4 py-2 text-sm transition",
                done
                  ? "border-white/10 text-muted/60"
                  : clsx("text-soft hover:bg-white/5", MODES[mode].border),
              )}
            >
              {done ? "✓ " : ""}
              {interaction.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {latest ? (
          <motion.p
            key={latest.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-auto mt-6 max-w-2xl text-center font-serif text-xl text-soft italic"
          >
            {latest.result}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {discoveries.length > 0 ? (
        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-white/10 bg-midnight/60 p-4">
          <p className="text-xs tracking-[0.2em] text-muted uppercase">Discoveries</p>
          <ul className="mt-2 space-y-1.5">
            {discoveries.map((d) => (
              <motion.li key={d} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-soft/90">
                <span className={MODES[mode].text}>✦</span> {d}
              </motion.li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted/60">
        An imagined scene for exploring an idea. Not a prediction of anything real.
      </p>
    </section>
  );
}
