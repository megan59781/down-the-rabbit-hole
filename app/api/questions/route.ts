import { handleAIError, notConfigured, readJson } from "@/lib/ai/http";
import { getProvider } from "@/lib/ai/provider";
import { generateQuestions } from "@/lib/ai/questions";
import { QuestionsRequestSchema } from "@/lib/schemas";

export const maxDuration = 60;

/** A question in, four new questions out. Never answers. */
export async function POST(request: Request) {
  const input = await readJson(request, QuestionsRequestSchema);
  if (input instanceof Response) return input;

  try {
    const provider = getProvider();
    if (!provider) return notConfigured();
    const questions = await generateQuestions(provider, input);
    return Response.json({ questions });
  } catch (error) {
    return handleAIError(error);
  }
}
