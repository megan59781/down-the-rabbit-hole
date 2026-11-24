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

/** What the model is asked to produce; limits are applied server-side afterwards. */
export const QuestionsModelSchema = z.object({
  questions: z.array(z.object({ text: z.string(), whisper: z.string() })),
});

/** Response, validated again in the browser. */
export const QuestionsResponseSchema = z.object({
  questions: z
    .array(z.object({ text: z.string().min(1).max(200), whisper: z.string().max(120) }))
    .min(2)
    .max(6),
});
