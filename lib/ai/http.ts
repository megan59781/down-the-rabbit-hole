import "server-only";
import { z } from "zod";
import { AIError } from "./provider";

export const MAX_BODY_BYTES = 20_000;

/** Parse and validate a JSON request body, returning a 400 Response on failure. */
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return errorResponse("That request is too large.", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse("Request body must be JSON.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "request";
    return errorResponse(`Invalid ${where}: ${issue?.message ?? "bad value"}.`, 400);
  }
  return parsed.data;
}

export function errorResponse(message: string, status: number, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, ...extra }, { status });
}

export function handleAIError(error: unknown) {
  if (error instanceof AIError) {
    return errorResponse(error.message, error.status, { retryable: error.retryable });
  }
  console.error("Unexpected generation error", error);
  return errorResponse("Something went wrong. Please try again.", 500, { retryable: true });
}

export const notConfigured = () =>
  errorResponse("AI isn't configured on this server yet.", 503, { code: "not_configured", retryable: false });


