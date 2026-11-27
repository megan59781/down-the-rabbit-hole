import { z } from "zod";
import { STYLE_AXES, STYLE_VALUES, TERRITORIES } from "@/lib/astray/territories";

export const MAX_QUESTION_LENGTH = 280;
/** How many already-rising questions a request may list, so new ones don't repeat them. */
export const MAX_EXCLUDE = 40;

export const ModeSchema = z.enum(["deeper", "stranger", "astray"]);

export const QuestionsRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
  /** Ancestor questions, root first, for context. */
  path: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(8).default([]),
  mode: ModeSchema,
  /** Questions already rising from this one, so new ones don't repeat them. */
  exclude: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(MAX_EXCLUDE).default([]),
  /** Astray only: the territories this person keeps choosing, so the AI can write away from them. */
  habits: z.array(z.enum(TERRITORIES)).max(5).default([]),
  /** You answered the rabbit: new questions grow out of what you said (never a reply to it). */
  answer: z
    .object({
      asked: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
      said: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    })
    .optional(),
  /** Astray only: what this person tends to pick and pass over, so the AI can write against it. */
  profile: z
    .object({
      leans: z.array(z.enum(STYLE_VALUES as [string, ...string[]])).max(4).default([]),
      picks: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(5).default([]),
      skips: z.array(z.string().max(MAX_QUESTION_LENGTH)).max(5).default([]),
    })
    .optional(),
});

const GeneratedQuestionSchema = z.object({
  text: z.string().min(1).max(200),
  whisper: z.string().max(120),
  territory: z.enum(TERRITORIES).optional(),
  style: z
    .object({
      tone: z.enum(STYLE_AXES.tone).optional(),
      scale: z.enum(STYLE_AXES.scale).optional(),
      lens: z.enum(STYLE_AXES.lens).optional(),
      focus: z.enum(STYLE_AXES.focus).optional(),
    })
    .optional(),
});

/** One line of the streamed response, validated again in the browser. */
export const QuestionEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("care") }),
  z.object({ type: z.literal("question"), question: GeneratedQuestionSchema }),
  z.object({ type: z.literal("error"), error: z.string(), retryable: z.boolean().optional() }),
  z.object({ type: z.literal("done") }),
]);

/** You caught the rabbit while holding this question. */
export const RabbitRequestSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
});

/** One line of the rabbit's streamed self-test, validated again in the browser. */
export const RabbitEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("candidate"), index: z.number().int().min(0).max(10), text: z.string().min(1).max(200) }),
  z.object({
    type: z.literal("verdict"),
    index: z.number().int().min(0).max(10),
    known: z.boolean(),
    attempt: z.string().max(140),
  }),
  z.object({ type: z.literal("ask"), index: z.number().int().min(0).max(10) }),
  z.object({ type: z.literal("error"), error: z.string(), retryable: z.boolean().optional() }),
  z.object({ type: z.literal("done") }),
]);

export const MAX_ANSWER_LENGTH = 200;
