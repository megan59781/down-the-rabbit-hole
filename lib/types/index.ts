// Shared domain types. Zod schemas mirroring these arrive with the AI layer (Gate 3).

export type ExplorationMode = "deeper" | "stranger";

export type VisualType = "branching_paths" | "timeline" | "domino_effect";

/** Where generated content came from. Demo content is always labelled as such in the UI. */
export type ContentSource = "ai" | "demo";

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

/** Interactions map to predefined handlers in the templates; nothing model-generated is executed. */
export type InteractionAction = "remove" | "reveal" | "select" | "trigger" | "reorder";

export type SimulationInteraction = {
  id: string;
  label: string;
  action: InteractionAction;
  /** Element the action applies to, when it targets one. */
  targetId?: string;
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
  /** "thought" is the original input; "question" nodes act as new thoughts; "mutation" nodes hold a simulation. */
  type: "thought" | "mutation" | "question";
  content: string;
  title?: string;
  mode?: ExplorationMode;
  simulation?: Simulation;
  children: string[];
  createdAt: string;

  /** thought/question nodes: generated mutations, cached per mode so switching back is instant. */
  mutations?: Partial<Record<ExplorationMode, Mutation[]>>;
  /** mutation nodes: the mutation this node explores. */
  mutation?: Mutation;
  /** mutation nodes: follow-up questions. */
  questions?: Question[];
  /** mutation nodes: ids of simulation interactions the user has applied, in order. */
  appliedInteractions?: string[];
  source?: ContentSource;
};

export type ExplorationSession = {
  id: string;
  originalThought: string;
  createdAt: string;
  nodes: ExplorationNode[];
  currentNodeId: string;
};
