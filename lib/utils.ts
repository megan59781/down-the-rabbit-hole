export function uid(prefix = ""): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}${random}`;
}

/** Strip trailing punctuation so a thought can be quoted inside another sentence. */
export function cleanThought(thought: string): string {
  return thought.trim().replace(/[.!?…]+$/u, "");
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
