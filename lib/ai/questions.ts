import "server-only";
import {
  STYLE_AXES,
  TERRITORIES,
  isTerritory,
  opposite,
  parseStyle,
  type Style,
  type StyleValue,
} from "@/lib/astray/territories";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";
import { AIError, type AIProvider } from "./provider";
import { BASE_SYSTEM, MODE_DIRECTION, pathBlock } from "./prompts";
import { needsCare } from "./safety";
import { clip, isQuestion } from "./sanitize";

/** Astray writes a wide field of candidates; the browser keeps the ones furthest from your habits. */
const ASTRAY_CANDIDATES = 10;
const RISING = 4;

const STYLE_PAIRS = Object.values(STYLE_AXES)
  .map((pair) => pair.join("/"))
  .join(", ");

// Plain lines rather than JSON, so each question can be shown the moment it's written.
function systemFor(count: number) {
  return `${BASE_SYSTEM}

Task: the person is falling down a rabbit hole, holding a question. Do not answer it. Give ${count} new questions that rise out of it, each opening a different path.

Each question:
- Q: ONE short, plain question ending in "?", max 70 characters.
- W: a whisper, a tiny evocative hint of why it's worth falling into, max 45 characters, not a question and never an answer. Examples: "Most rules arrive without a vote." / "Tuesdays would last a week."
- T: the one territory it mostly belongs to, exactly one of: ${TERRITORIES.join(", ")}.
- S: its style, one word from each pair: ${STYLE_PAIRS}.
- Different in kind from the others: an assumption challenged, a world where something is different, a surprising angle, a fact worth wondering about.
- Grows directly out of the question held, and only that question: treat it as if it were asked fresh, not as part of a longer conversation. Not a generic question that could follow anything.
- No preamble, no "if X, then Y" setups, no repeating the question back.

Output format, exactly, nothing else:
CARE: yes or no (yes only if the question suggests real distress or risk of harm)
Q: <question>
W: <whisper>
T: <territory>
S: <tone>, <scale>, <lens>, <focus>
(repeat Q, W, T and S ${count} times)`;
}

const CARE_DIRECTION = `Care first: this question may come from a hard place. Whatever the mode, stay gentle, grounded and kind. Nothing strange or playful about the pain itself. One question should point towards talking to someone they trust or a support line.`;

type Profile = { leans: string[]; picks: string[]; skips: string[] };

/**
 * The anti-algorithm brief: who this person is as a chooser, and the instruction to write the
 * questions they would normally scroll past. Only what Astray needs, only in Astray.
 */
function againstTheGrain(habits: string[], profile?: Profile): string {
  const lines: string[] = [];
  if (habits.length) {
    lines.push(`They keep choosing questions about: ${habits.join(", ")}. At most one question may touch those territories.`);
  }
  if (profile?.leans.length) {
    const against = profile.leans.map((v) => opposite(v as StyleValue));
    lines.push(`They usually pick questions that are ${profile.leans.join(", ")}. Write ones that are ${against.join(", ")} instead.`);
  }
  if (profile?.picks.length) {
    lines.push(`Questions they recently chose (write nothing like these):\n${profile.picks.map((q) => `- ${q}`).join("\n")}`);
  }
  if (profile?.skips.length) {
    lines.push(`Questions they recently passed over (lean towards this kind):\n${profile.skips.map((q) => `- ${q}`).join("\n")}`);
  }
  if (!lines.length) return "";
  return `\n\nThis is the anti-algorithm. A normal feed gives people more of what they like; you give them what they would usually scroll past, so they meet the parts of the world they keep avoiding. Not cruel, not dull on purpose, still genuinely worth wondering about, still growing from the question held. But clearly not their usual taste.\n${lines.join("\n")}`;
}

export type QuestionEvent = { type: "care" } | { type: "question"; question: GeneratedQuestion };

/**
 * Streams new questions one at a time as the model writes them. Also flags questions that
 * need a gentler, care-first response (from a keyword check and from the model itself).
 */
export async function* streamQuestions(
  provider: AIProvider,
  input: {
    question: string;
    path: string[];
    mode: ExplorationMode;
    exclude: string[];
    habits: string[];
    profile?: Profile;
  },
  signal?: AbortSignal,
): AsyncGenerator<QuestionEvent> {
  const care = needsCare(input.question);
  if (care) yield { type: "care" };

  // Someone in distress gets four gentle questions, never a field of strange candidates.
  const astray = input.mode === "astray" && !care;
  const count = astray ? ASTRAY_CANDIDATES : RISING;
  const excludeLine = input.exclude.length
    ? `\n\nAlready rising from this question (do not repeat or rephrase):\n${input.exclude.map((q) => `- ${q}`).join("\n")}`
    : "";
  const grainLine = astray ? againstTheGrain(input.habits, input.profile) : "";
  const direction = care ? CARE_DIRECTION : MODE_DIRECTION[input.mode];

  const seen = new Set([input.question, ...input.exclude].map((q) => q.toLowerCase()));
  let flaggedCare = care;
  let sent = 0;
  let current: { text: string; whisper?: string; territory?: string; style?: Style } | null = null;
  let buffer = "";

  function* finish(): Generator<QuestionEvent> {
    const q = current;
    current = null;
    if (!q || q.whisper === undefined || sent >= count) return;
    if (!isQuestion(q.text) || seen.has(q.text.toLowerCase())) return;
    seen.add(q.text.toLowerCase());
    sent++;
    const t = q.territory?.trim().toLowerCase();
    yield {
      type: "question",
      question: { text: q.text, whisper: q.whisper, territory: t && isTerritory(t) ? t : undefined, style: q.style },
    };
  }

  // Turn one finished line into an event, if it completes something.
  function* readLine(line: string): Generator<QuestionEvent> {
    const match = /^\s*(CARE|Q|W|T|S)\s*:\s*(.*)$/i.exec(line);
    if (!match) return;
    const [, tag, value] = match;
    switch (tag.toUpperCase()) {
      case "CARE":
        if (!flaggedCare && /^yes/i.test(value.trim())) {
          flaggedCare = true;
          yield { type: "care" };
        }
        break;
      case "Q":
        // A new question before the last one was fully tagged: send the last one as it is.
        if (current?.whisper !== undefined) yield* finish();
        current = { text: clip(value, 160) };
        break;
      case "W":
        if (current) current.whisper = clip(value, 90);
        break;
      case "T":
        if (current) current.territory = value;
        break;
      case "S":
        if (current) current.style = parseStyle(value);
        yield* finish();
        break;
    }
  }

  for await (const delta of provider.streamText({
    system: systemFor(count),
    prompt: `${direction}${grainLine}${pathBlock(input.path)}${excludeLine}\n\n<question>${input.question}</question>`,
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
  yield* finish();

  if (sent < 2) {
    throw new AIError("The questions got lost on the way. Please try again.", 502);
  }
}
