import "server-only";
import { QuestionsModelSchema } from "@/lib/schemas";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";
import { AIError, type AIProvider } from "./provider";
import { BASE_SYSTEM, MODE_DIRECTION, pathBlock } from "./prompts";
import { clip, isQuestion } from "./sanitize";

const SYSTEM = `${BASE_SYSTEM}

Task: the person is falling down a rabbit hole, holding a question. Do not answer it. Give 4 new questions that rise out of it, each opening a different path.

Each question:
- text: ONE short, plain question ending in "?", max 70 characters.
- whisper: a tiny evocative hint of why it's worth falling into, max 45 characters, not a question and never an answer. Examples: "Most rules arrive without a vote." / "Tuesdays would last a week."
- Different in kind from the others: an assumption challenged, a world where something is different, a surprising angle, something personal or philosophical.
- Grows directly out of the question held, not a generic question that could follow anything.
- No preamble, no "if X, then Y" setups, no repeating the question back.`;

export async function generateQuestions(
  provider: AIProvider,
  input: { question: string; path: string[]; mode: ExplorationMode; exclude: string[] },
): Promise<GeneratedQuestion[]> {
  const excludeLine = input.exclude.length
    ? `\n\nAlready rising from this question (do not repeat or rephrase):\n${input.exclude.map((q) => `- ${q}`).join("\n")}`
    : "";

  const result = await provider.generate({
    system: SYSTEM,
    prompt: `${MODE_DIRECTION[input.mode]}${pathBlock(input.path)}${excludeLine}\n\n<question>${input.question}</question>`,
    schema: QuestionsModelSchema,
  });

  const seen = new Set([input.question, ...input.exclude].map((q) => q.toLowerCase()));
  const questions: GeneratedQuestion[] = [];
  for (const q of result.questions) {
    const text = clip(q.text, 160);
    if (!isQuestion(text) || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    questions.push({ text, whisper: clip(q.whisper, 90) });
    if (questions.length === 4) break;
  }

  if (questions.length < 2) {
    throw new AIError("The questions got lost on the way. Please try again.", 502);
  }
  return questions;
}
