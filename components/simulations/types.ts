import type { ExplorationMode, Simulation, SimulationInteraction } from "@/lib/types";

export type TemplateProps = {
  simulation: Simulation;
  /** Interactions already applied, in order. Templates derive their visual state from this. */
  applied: SimulationInteraction[];
  onApply: (interaction: SimulationInteraction) => void;
  mode: ExplorationMode;
};

export const MODE_STROKE = {
  deeper: "var(--color-ice)",
  stranger: "var(--color-pink)",
} as const;
