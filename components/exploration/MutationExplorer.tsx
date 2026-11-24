"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { MODES } from "@/lib/modes";
import type { ExplorationMode, Mutation } from "@/lib/types";

const DIRECTION_LABEL: Record<Mutation["direction"], string> = {
  possibility: "Possibility",
  challenge: "Challenge",
  wildcard: "Wildcard",
};

const VISUAL_LABEL: Record<Mutation["visualType"], string> = {
  branching_paths: "Branching paths",
  timeline: "Timeline",
  domino_effect: "Domino effect",
};

type MutationCardProps = {
  mutation: Mutation;
  mode: ExplorationMode;
  index: number;
  visited: boolean;
  onOpen: () => void;
};

export function MutationCard({ mutation, mode, index, visited, onOpen }: MutationCardProps) {
  const m = MODES[mode];
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 24, rotate: index === 1 ? 0 : index === 0 ? -1.5 : 1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ delay: index * 0.12, type: "spring", stiffness: 120, damping: 16 }}
      whileHover={{ y: -6 }}
      className={clsx(
        "group relative flex h-full flex-col rounded-3xl border border-white/10 bg-midnight-2/80 p-6 text-left transition-colors",
        mode === "deeper" ? "hover:border-ice/50" : "hover:border-pink/50",
      )}
    >
      <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs tracking-[0.18em] uppercase">
        <span className={m.text}>{DIRECTION_LABEL[mutation.direction]}</span>
        <span className="text-muted/70">{VISUAL_LABEL[mutation.visualType]}</span>
      </span>
      <span className="mt-4 font-serif text-2xl leading-tight text-soft">{mutation.title}</span>
      <span className="mt-3 text-lg leading-snug text-soft/90">{mutation.thought}</span>
      <span className="mt-3 text-sm text-muted">{mutation.description}</span>
      <span className="mt-auto pt-6 text-sm text-muted/80 italic">{mutation.question}</span>
      <span
        className={clsx(
          "mt-4 font-display text-sm font-semibold transition group-hover:translate-x-1",
          m.text,
        )}
      >
        {visited ? "Return to this world →" : "Enter this world →"}
      </span>
    </motion.button>
  );
}

type MutationExplorerProps = {
  mutations: Mutation[];
  mode: ExplorationMode;
  visitedIds: string[];
  onOpen: (mutation: Mutation) => void;
};

export function MutationExplorer({ mutations, mode, visitedIds, onOpen }: MutationExplorerProps) {
  return (
    <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {mutations.map((mutation, i) => (
        <MutationCard
          key={mutation.id}
          mutation={mutation}
          mode={mode}
          index={i}
          visited={visitedIds.includes(mutation.id)}
          onOpen={() => onOpen(mutation)}
        />
      ))}
    </div>
  );
}
