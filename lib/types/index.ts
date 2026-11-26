// Shared domain types.
import type { Style, Territory } from "@/lib/astray/territories";

/** Deeper and Stranger shape what the AI writes; Astray steers away from your own habits. */
export type ExplorationMode = "deeper" | "stranger" | "astray";

export type QuestionNode = {
  id: string;
  parentId: string | null;
  text: string;
  /** A short hint of why the question is interesting. Never an answer. */
  whisper?: string;
  /** The direction of the fall this question rose from (the root counts as deeper). */
  mode: ExplorationMode;
  /** What kind of thing the question is about, tagged by the AI. */
  territory?: Territory;
  /** What kind of question it is (playful or serious, small or vast…), tagged by the AI. */
  style?: Style;
  children: string[];
  createdAt: string;
  /** The candidates Astray turned down last time questions rose from here (they were too "you"). */
  passedOver?: { text: string; territory?: Territory; style?: Style }[];
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
  /** Set once anything in this fall sounds like real distress: shows support, keeps things gentle. */
  care?: boolean;
};

/** A freshly generated question, as returned by /api/questions. */
export type GeneratedQuestion = { text: string; whisper: string; territory?: Territory; style?: Style };
