// Shared domain types.

export type ExplorationMode = "deeper" | "stranger";

export type QuestionNode = {
  id: string;
  parentId: string | null;
  text: string;
  /** A short hint of why the question is interesting. Never an answer. */
  whisper?: string;
  /** The direction of the fall this question rose from (the root counts as deeper). */
  mode: ExplorationMode;
  children: string[];
  createdAt: string;
};

export type ExplorationSession = {
  id: string;
  rootQuestion: string;
  createdAt: string;
  nodes: QuestionNode[];
  /** The question you are currently falling through. */
  focusId: string;
  /** Current direction of the fall. */
  mode: ExplorationMode;
};

/** A freshly generated question, as returned by /api/questions. */
export type GeneratedQuestion = { text: string; whisper: string };
