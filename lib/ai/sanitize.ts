/** Trim, collapse whitespace and cap length on model-provided text. */
export function clip(text: string | undefined, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function isQuestion(text: string): boolean {
  return text.length > 3 && text.endsWith("?");
}
