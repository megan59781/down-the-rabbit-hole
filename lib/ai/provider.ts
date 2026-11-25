import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** Provider-neutral interface: stream plain text so the UI can show results as they arrive. */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  streamText(request: { system: string; prompt: string; signal?: AbortSignal }): AsyncIterable<string>;
}

/** Errors safe to show the user. `retryable` hints whether "Try again" is worth offering. */
export class AIError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable = true,
  ) {
    super(message);
    this.name = "AIError";
  }
}

const MODEL_ALIASES: Record<string, string> = {
  opus: "claude-opus-5-5",
  sonnet: "claude-sonnet-5-5",
  haiku: "claude-haiku-5-5",
};
const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";
// Models that accept the server-side refusal fallback chain.
const FALLBACK_MODELS = new Set([
  "claude-opus-5-5",
  "claude-opus-5",
  "claude-sonnet-5-5",
  "claude-fable-5-1",
  "claude-fable-5-2",
]);

const REQUEST_TIMEOUT_MS = 50_000;
const MAX_OUTPUT_TOKENS = 2000;

class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string,
  ) {
    this.client = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  }

  async *streamText({ system, prompt, signal }: Parameters<AIProvider["streamText"]>[0]) {
    try {
      const stream = this.client.beta.messages.stream(
        {
          model: this.model,
          // Four short questions need a few hundred tokens; the cap keeps a runaway reply cheap.
          max_tokens: MAX_OUTPUT_TOKENS,
          system,
          messages: [{ role: "user", content: prompt }],
          // Low effort keeps an interactive loop snappy; these are short creative outputs.
          output_config: { effort: "low" },
          ...(FALLBACK_MODELS.has(this.model)
            ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
            : {}),
        },
        { signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") {
        throw new AIError("The rabbit won't follow this one. Try asking it differently.", 422, false);
      }
    } catch (error) {
      throw toAIError(error);
    }
  }
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AIError("The rabbit took too long to come back. Please try again.", 504);
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new AIError("The AI service rejected our credentials. Check the server's API key.", 500, false);
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new AIError("The configured AI model wasn't found. Check AI_MODEL.", 500, false);
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AIError("Too many explorations at once. Wait a moment and try again.", 429);
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new AIError("The AI service couldn't handle this request.", 502, false);
  }
  if (error instanceof Anthropic.APIError) {
    return new AIError("The AI service is having trouble right now. Please try again.", 502);
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AIError("Couldn't reach the AI service. Please try again.", 502);
  }
  // Includes schema validation failures from the parser.
  return new AIError("Something went wrong generating this. Please try again.", 502);
}

export function resolveModel(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) return DEFAULT_ANTHROPIC_MODEL;
  return MODEL_ALIASES[value.toLowerCase()] ?? value;
}

/** Returns the configured provider, or null when no AI is configured. */
export function getProvider(): AIProvider | null {
  const provider = (process.env.AI_PROVIDER ?? "anthropic").trim().toLowerCase();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) return null;
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(apiKey, resolveModel(process.env.AI_MODEL));
    default:
      throw new AIError(`Unsupported AI_PROVIDER "${provider}".`, 500, false);
  }
}
