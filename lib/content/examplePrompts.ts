// Starter questions shown under the input. All curiosity, no self-criticism: the odd,
// the everyday, the scientific and the impossible.
export const EXAMPLE_PROMPTS = [
  "Why do we keep things we never use?",
  "What if cities could remember?",
  "Why do cats knock things off tables?",
  "Is a habit a decision you stopped making?",
  "Why does time go faster as we get older?",
  "What if every lie created a parallel world?",
  "Do we own our memories, or do they own us?",
  "What would money look like if it expired?",
  "Why do we apologise to furniture we bump into?",
  "What if silence was a currency?",
  "Are maps just opinions about the world?",
  "Why do some songs feel like places?",
  "What if dreams were someone else's memories?",
  "What if gravity got weaker on Sundays?",
  "Is boredom secretly a superpower?",
  "Why do we name our cars but not our fridges?",
  "What if weather reacted to how people feel?",
  "Is a borrowed book ever really returned?",
  "What if your shadow had its own opinions?",
  "Why do we tidy up before the cleaner arrives?",
  "Doors are the most underrated invention.",
  "What if every object kept a record of who touched it?",
  "Why does the first sip of tea taste the best?",
  "What if the internet forgot everything each night?",
  "Who decided a week has seven days?",
  "What if you could only speak in questions for a day?",
  "Why do we feel nostalgic for times we never lived in?",
  "What if clocks ran at different speeds in every house?",
  "Keys are strange: tiny metal permissions.",
  "What if animals were judging our architecture?",
  "Why is yawning contagious?",
  "What if every street had a secret rule?",
  "Is a playlist a kind of autobiography?",
  "Where does a thought go when you forget it?",
  "Why do octopuses have three hearts?",
  "What if colours had sounds?",
  "Could a city be alive?",
  "Why do we count sheep to fall asleep?",
  "What if the moon had a smell?",
  "Why are there exactly 26 letters?",
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
