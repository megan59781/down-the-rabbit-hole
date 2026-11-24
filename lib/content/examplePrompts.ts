// Starter thoughts shown under the input. Deliberately mixed: curious, odd, philosophical, everyday.
export const EXAMPLE_PROMPTS = [
  "Why do we keep things we never use?",
  "What if cities could remember?",
  "My houseplants seem happier than me.",
  "Is a habit a decision you stopped making?",
  "Why does time go faster as we get older?",
  "What if every lie created a parallel world?",
  "I always choose the same seat on the bus.",
  "Do we own our memories, or do they own us?",
  "What would money look like if it expired?",
  "Why do we apologise to furniture we bump into?",
  "What if silence was a currency?",
  "Maps are just opinions about the world.",
  "Why do some songs feel like places?",
  "What if nobody was allowed to repeat a word?",
  "Every queue is a tiny society.",
  "What if dreams were someone else's memories?",
  "Why do we trust strangers on the internet?",
  "What if gravity got weaker on Sundays?",
  "Boredom might be a superpower.",
  "Why do we name our cars but not our fridges?",
  "What if weather reacted to how people feel?",
  "Is a borrowed book ever really returned?",
  "What if your shadow had its own opinions?",
  "We tidy up before the cleaner arrives.",
  "Why do we say 'see you later' to people we'll never see again?",
  "What if languages could go extinct overnight?",
  "Doors are the most underrated invention.",
  "What if every object kept a record of who touched it?",
  "Why does the first sip of tea taste the best?",
  "What if the internet forgot everything each night?",
  "Rules are just old agreements nobody renegotiated.",
  "What if you could only speak in questions for a day?",
  "Why do we feel nostalgic for times we never lived in?",
  "What if clocks ran at different speeds in every house?",
  "Keys are strange: tiny metal permissions.",
  "What if animals were judging our architecture?",
  "I'm falling behind everyone else.",
  "Why do we finish the TV series we stopped enjoying?",
  "What if every street had a secret rule?",
  "Is a playlist a kind of autobiography?",
] as const;

/** Pick `count` distinct prompts, optionally avoiding the ones currently shown. */
export function pickPrompts(count: number, avoid: readonly string[] = []): string[] {
  const pool = EXAMPLE_PROMPTS.filter((p) => !avoid.includes(p));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
