import { AIError, getProvider } from "@/lib/ai/provider";
import { errorResponse, handleAIError, notConfigured, readJson } from "@/lib/ai/http";
import { ndjsonWriter } from "@/lib/ai/ndjson";
import { streamQuestions } from "@/lib/ai/questions";
import { checkRateLimit } from "@/lib/ai/rateLimit";
import { clientIdOf, isSameOrigin } from "@/lib/ai/safety";
import { QuestionsRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/**
 * A question in, new questions out, streamed as newline-delimited JSON so each one can
 * rise the moment it's written. Never answers.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("Not allowed.", 403, { retryable: false });

  const input = await readJson(request, QuestionsRequestSchema);
  if (input instanceof Response) return input;

  let provider;
  try {
    provider = getProvider();
  } catch (error) {
    return handleAIError(error);
  }
  if (!provider) return notConfigured();

  const limit = await checkRateLimit(clientIdOf(request));
  if (!limit.ok) {
    return Response.json(
      { error: limit.message, retryable: true },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const { send, close } = ndjsonWriter(controller, request.signal);
      try {
        for await (const event of streamQuestions(provider, input, request.signal)) send(event);
        send({ type: "done" });
      } catch (error) {
        if (!request.signal.aborted) {
          const known = error instanceof AIError;
          if (!known) console.error("Unexpected generation error", error);
          send({
            type: "error",
            error: known ? error.message : "Something went wrong. Please try again.",
            retryable: known ? error.retryable : true,
          });
        }
      } finally {
        close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
