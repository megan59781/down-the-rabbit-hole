import { AIError, getProvider } from "@/lib/ai/provider";
import { errorResponse, handleAIError, notConfigured, readJson } from "@/lib/ai/http";
import { askRabbit } from "@/lib/ai/rabbit";
import { checkRateLimit, clientIdOf, isSameOrigin, needsCare } from "@/lib/ai/safety";
import { RabbitRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/**
 * You caught the rabbit: it streams its self-test (each candidate, whether it could answer it
 * itself, and its attempt), then which question it will ask you.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Not allowed.", 403, { retryable: false });

  const input = await readJson(request, RabbitRequestSchema);
  if (input instanceof Response) return input;
  // Someone who may be struggling isn't quizzed by a rabbit.
  if (needsCare(input.question)) return errorResponse("The rabbit is letting you be for now.", 409, { retryable: false });

  let provider;
  try {
    provider = getProvider();
  } catch (error) {
    return handleAIError(error);
  }
  if (!provider) return notConfigured();

  // A write and a test per round (usually one round): counted as two calls against the limits.
  const id = clientIdOf(request);
  for (let i = 0; i < 2; i++) {
    const limit = checkRateLimit(id);
    if (!limit.ok) {
      return Response.json(
        { error: limit.message, retryable: true },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
      );
    }
  }

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        for await (const event of askRabbit(provider, input.question, request.signal)) send(event);
        send({ type: "done" });
      } catch (error) {
        if (!request.signal.aborted) {
          const known = error instanceof AIError;
          if (!known) console.error("Unexpected rabbit error", error);
          send({
            type: "error",
            error: known ? error.message : "The rabbit lost its question. Please try again.",
            retryable: known ? error.retryable : true,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
