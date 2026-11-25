import { z } from "zod";

export const MAX_QUESTION_LENGTH = 280;

export const ModeSchema = z.enum(["deeper", "stranger"]);

export const QuestionsRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  /** Ancestor questions, root first, for context. */
  path: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(8).default([]),
  mode: ModeSchema,
  /** Questions already rising from this one, so new ones don't repeat them. */
  exclude: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(40).default([]),
});

const GeneratedQuestionSchema = z.object({ text: z.string().min(1).max(200), whisper: z.string().max(120) });

/** One line of the streamed response, validated again in the browser. */
export const QuestionEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("care") }),
  z.object({ type: z.literal("question"), question: GeneratedQuestionSchema }),
  z.object({ type: z.literal("error"), error: z.string(), retryable: z.boolean().optional() }),
  z.object({ type: z.literal("done") }),
]);
