// Browser-side calls to the API: each reads a stream line by line, validating every event.
import type { z } from "zod";
import { QuestionEventSchema, RabbitEventSchema } from "@/lib/schemas";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";

const CLIENT_TIMEOUT_MS = 70_000;

/**
 * A signal that aborts when either does. AbortSignal.any where it exists; older browsers
 * (Safari before 17.4) get the same thing built by hand.
 */
export function anySignal(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (typeof AbortSignal.any === "function") return AbortSignal.any([a, b]);
  const both = new AbortController();
  for (const signal of [a, b]) {
    if (signal.aborted) {
      both.abort(signal.reason);
      break;
    }
    signal.addEventListener("abort", () => both.abort(signal.reason), { once: true });
  }
  return both.signal;
}

/** POST `body` to `url` and hand each valid NDJSON event to `onEvent`. Server errors throw. */
async function streamEvents<T extends { type: string }>(
  url: string,
  body: unknown,
  schema: z.ZodType<T>,
  onEvent: (event: T) => void,
  /** Cancels the request (and, through the server, its AI calls) when the caller loses interest. */
  cancel?: AbortSignal,
): Promise<void> {
  const timeout = AbortSignal.timeout(CLIENT_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: cancel ? anySignal(timeout, cancel) : timeout,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new Error(timedOut ? "The rabbit took too long to come back." : "Couldn't reach the server. Check your connection.");
  }

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Something went wrong.");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  const handle = (line: string) => {
    if (!line.trim()) return;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return;
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data as T & { error?: string };
    if (event.type === "error") throw new Error(event.error ?? "Something went wrong.");
    onEvent(event);
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        handle(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    handle(buffer);
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") throw new Error("The rabbit took too long to come back.");
    if (error instanceof TypeError || error instanceof DOMException) throw new Error("The connection dropped. Please try again.");
    throw error;
  }
}

export async function streamQuestions(
  input: {
    question: string;
    path: string[];
    mode: ExplorationMode;
    exclude: string[];
    habits?: string[];
    profile?: { leans: string[]; picks: string[]; skips: string[] };
    answer?: { asked: string; said: string };
  },
  handlers: { onQuestion: (q: GeneratedQuestion) => void; onCare: () => void },
): Promise<number> {
  let count = 0;
  await streamEvents("/api/questions", input, QuestionEventSchema, (event) => {
    if (event.type === "question") {
      count++;
      handlers.onQuestion(event.question);
    } else if (event.type === "care") {
      handlers.onCare();
    }
  });
  if (count === 0) throw new Error("The questions got lost on the way. Please try again.");
  return count;
}

export type RabbitTestEvent = z.infer<typeof RabbitEventSchema>;

/** Catch the rabbit: streams its self-test, ending with which candidate it will ask. */
export async function streamRabbit(
  question: string,
  cancel: AbortSignal,
  onEvent: (event: RabbitTestEvent) => void,
): Promise<void> {
  let asked = false;
  await streamEvents(
    "/api/rabbit",
    { question },
    RabbitEventSchema,
    (event) => {
      if (event.type === "ask") asked = true;
      onEvent(event);
    },
    cancel,
  );
  if (!asked) throw new Error("The rabbit lost its question. Please try again.");
}
