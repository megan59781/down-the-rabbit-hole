import "server-only";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";
import { AIError, type AIProvider } from "./provider";
import { BASE_SYSTEM, MODE_DIRECTION, pathBlock } from "./prompts";
import { needsCare } from "./safety";
import { clip, isQuestion } from "./sanitize";

const COUNT = 4;

// Plain lines rather than JSON, so each question can be shown the moment it's written.
const SYSTEM = `${BASE_SYSTEM}

Task: the person is falling down a rabbit hole, holding a question. Do not answer it. Give ${COUNT} new questions that rise out of it, each opening a different path.

Each question:
- Q: ONE short, plain question ending in "?", max 70 characters.
- W: a whisper, a tiny evocative hint of why it's worth falling into, max 45 characters, not a question and never an answer. Examples: "Most rules arrive without a vote." / "Tuesdays would last a week."
- Different in kind from the others: an assumption challenged, a world where something is different, a surprising angle, a fact worth wondering about.
- Grows directly out of the question held, and only that question: treat it as if it were asked fresh, not as part of a longer conversation. Not a generic question that could follow anything.
- No preamble, no "if X, then Y" setups, no repeating the question back.

Output format, exactly, nothing else:
CARE: yes or no (yes only if the question suggests real distress or risk of harm)
Q: <question>
W: <whisper>
(repeat Q and W ${COUNT} times)`;

const CARE_DIRECTION = `Care first: this question may come from a hard place. Whatever the mode, stay gentle, grounded and kind. Nothing strange or playful about the pain itself. One question should point towards talking to someone they trust or a support line.`;

export type QuestionEvent = { type: "care" } | { type: "question"; question: GeneratedQuestion };

/**
 * Streams new questions one at a time as the model writes them. Also flags questions that
 * need a gentler, care-first response (from a keyword check and from the model itself).
 */
export async function* streamQuestions(
  provider: AIProvider,
  input: { question: string; path: string[]; mode: ExplorationMode; exclude: string[] },
  signal?: AbortSignal,
): AsyncGenerator<QuestionEvent> {
  const care = needsCare(input.question);
  if (care) yield { type: "care" };

  const excludeLine = input.exclude.length
    ? `\n\nAlready rising from this question (do not repeat or rephrase):\n${input.exclude.map((q) => `- ${q}`).join("\n")}`
    : "";
  const direction = care ? CARE_DIRECTION : MODE_DIRECTION[input.mode];

  const seen = new Set([input.question, ...input.exclude].map((q) => q.toLowerCase()));
  let flaggedCare = care;
  let count = 0;
  let pendingText: string | null = null;
  let buffer = "";

  // Turn one finished line into an event, if it completes something.
  function* readLine(line: string): Generator<QuestionEvent> {
    const match = /^\s*(CARE|Q|W)\s*:\s*(.*)$/i.exec(line);
    if (!match) return;
    const [, tag, value] = match;
    const kind = tag.toUpperCase();
    if (kind === "CARE") {
      if (!flaggedCare && /^yes/i.test(value.trim())) {
        flaggedCare = true;
        yield { type: "care" };
      }
    } else if (kind === "Q") {
      pendingText = clip(value, 160);
    } else if (pendingText !== null) {
      const text: string = pendingText;
      pendingText = null;
      if (count >= COUNT || !isQuestion(text) || seen.has(text.toLowerCase())) return;
      seen.add(text.toLowerCase());
      count++;
      yield { type: "question", question: { text, whisper: clip(value, 90) } };
    }
  }

  for await (const delta of provider.streamText({
    system: SYSTEM,
    prompt: `${direction}${pathBlock(input.path)}${excludeLine}\n\n<question>${input.question}</question>`,
    signal,
  })) {
    buffer += delta;
    let newline: number;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      yield* readLine(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
    }
  }
  if (buffer) yield* readLine(buffer);

  if (count < 2) {
    throw new AIError("The questions got lost on the way. Please try again.", 502);
  }
}
