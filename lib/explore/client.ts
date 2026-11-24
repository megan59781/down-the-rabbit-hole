// Browser-side calls to the API routes, with responses validated before use.
import { z } from "zod";
import { QuestionsResponseSchema } from "@/lib/schemas";
import type { ExplorationMode, GeneratedQuestion } from "@/lib/types";

const CLIENT_TIMEOUT_MS = 70_000;

async function post<T>(url: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new Error(timedOut ? "The rabbit took too long to come back." : "Couldn't reach the server. Check your connection.");
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((data as { error?: string } | null)?.error ?? "Something went wrong.");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error("The response didn't look right.");
  return parsed.data;
}

export async function requestQuestions(input: {
  question: string;
  path: string[];
  mode: ExplorationMode;
  exclude: string[];
}): Promise<GeneratedQuestion[]> {
  const { questions } = await post("/api/questions", input, QuestionsResponseSchema);
  return questions;
}
