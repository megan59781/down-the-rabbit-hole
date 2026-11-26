// Browser-side call to the questions API: reads the stream line by line, validating each event.
import { QuestionEventSchema } from "@/lib/schemas";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";

const CLIENT_TIMEOUT_MS = 70_000;

export async function streamQuestions(
  input: {
    question: string;
    path: string[];
    mode: ExplorationMode;
    exclude: string[];
    habits?: string[];
    profile?: { leans: string[]; picks: string[]; skips: string[] };
  },
  handlers: { onQuestion: (q: GeneratedQuestion) => void; onCare: () => void },
): Promise<number> {
  let response: Response;
  try {
    response = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
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
  let count = 0;
  const handle = (line: string) => {
    if (!line.trim()) return;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      return;
    }
    const parsed = QuestionEventSchema.safeParse(raw);
    if (!parsed.success) return;
    const event = parsed.data;
    if (event.type === "question") {
      count++;
      handlers.onQuestion(event.question);
    } else if (event.type === "care") {
      handlers.onCare();
    } else if (event.type === "error") {
      throw new Error(event.error);
    }
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
  if (count === 0) throw new Error("The questions got lost on the way. Please try again.");
  return count;
}
