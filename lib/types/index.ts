// Shared domain types. Zod schemas mirroring these arrive with the AI layer (Gate 3).

export type ExplorationMode = "deeper" | "stranger";

export type VisualType = "branching_paths" | "timeline" | "domino_effect";

export type Mutation = {
  id: string;
  title: string;
  direction: "possibility" | "challenge" | "wildcard";
  thought: string;
  description: string;
  question: string;
  visualType: VisualType;
};

export type SimulationElement = {
  id: string;
  type: "person" | "object" | "path" | "node" | "label";
  label: string;
  x: number;
  y: number;
  properties: Record<string, string | number | boolean>;
};

export type SimulationInteraction = {
  id: string;
  label: string;
  action: string;
  result: string;
};

export type Simulation = {
  id: string;
  title: string;
  description: string;
  visualType: VisualType;
  atmosphere: "calm" | "strange" | "tense" | "playful";
  elements: SimulationElement[];
  interactions: SimulationInteraction[];
  discoveries: string[];
};

export type Question = {
  id: string;
  text: string;
  type: "philosophical" | "personal" | "counterfactual" | "challenging" | "unexpected";
};

export type QuestionResult = {
  questions: Question[];
  suggestedThought: string;
};

export type ExplorationNode = {
  id: string;
  parentId: string | null;
  type: "thought" | "mutation" | "question";
  content: string;
  title?: string;
  mode?: ExplorationMode;
  simulation?: Simulation;
  children: string[];
  createdAt: string;
};

export type ExplorationSession = {
  id: string;
  originalThought: string;
  createdAt: string;
  nodes: ExplorationNode[];
  currentNodeId: string;
};
