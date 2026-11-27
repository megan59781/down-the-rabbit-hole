import type { AIProvider } from "@/lib/ai/provider";

/** Split text into small uneven chunks, the way a real stream arrives (mid-line, mid-word). */
export function chunk(text: string, size = 7): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

/**
 * A provider that streams scripted replies, one per call, and records what it was asked.
 * Each reply is chunked so parsers are tested against lines split across chunks.
 */
export function fakeProvider(...replies: string[]) {
  const calls: { system: string; prompt: string }[] = [];
  let next = 0;
  const provider: AIProvider = {
    name: "fake",
    model: "fake-model",
    async *streamText({ system, prompt }) {
      calls.push({ system, prompt });
      for (const piece of chunk(replies[next++] ?? "")) yield piece;
    },
  };
  return { provider, calls };
}

export async function collect<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of stream) out.push(item);
  return out;
}
