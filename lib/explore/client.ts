// Frontend generation calls. In Gate 2 these return labelled demo content;
// Gate 3 swaps the bodies for requests to /api/explore and /api/continue.
import { mockMutations, mockQuestions, mockSimulation } from "@/lib/mock";
import type {
  ContentSource,
  ExplorationMode,
  Mutation,
  Question,
  Simulation,
  SimulationInteraction,
} from "@/lib/types";
import { wait } from "@/lib/utils";

const fakeLatency = () => wait(700 + Math.random() * 700);

export type MutationsResult = { mutations: Mutation[]; source: ContentSource };

export async function requestMutations(input: {
  thought: string;
  mode: ExplorationMode;
  history: string[];
}): Promise<MutationsResult> {
  await fakeLatency();
  return { mutations: mockMutations(input.thought, input.mode), source: "demo" };
}

export type ContinueResult = {
  simulation?: Simulation;
  questions: Question[];
  suggestedThought: string;
  source: ContentSource;
};

export async function requestContinue(input: {
  originalThought: string;
  thought: string;
  selectedMutation: Mutation;
  mode: ExplorationMode;
  interaction: SimulationInteraction | null;
  history: string[];
  /** Only generate questions (no new simulation), e.g. after an interaction or "more questions". */
  questionsOnly?: boolean;
  excludeQuestions?: string[];
}): Promise<ContinueResult> {
  await fakeLatency();
  const { questions, suggestedThought } = mockQuestions(
    input.thought,
    input.selectedMutation,
    input.interaction,
    input.excludeQuestions,
  );
  return {
    simulation: input.questionsOnly
      ? undefined
      : mockSimulation(input.thought, input.selectedMutation, input.mode),
    questions,
    suggestedThought,
    source: "demo",
  };
}
