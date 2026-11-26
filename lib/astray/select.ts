"use client";

import type { GeneratedQuestion } from "@/lib/types";
import { embed } from "./embedder";
import { FADE_PER_CHOICE, type Habits, leanings, styleLean } from "./habits";
import { STYLE_AXES, TERRITORIES, type StyleAxis, type Territory } from "./territories";

// The anti-recommender. A normal feed scores what you'll probably like and shows the top.
// This scores how "you" each candidate is, by topic, by kind and by meaning, and shows what's
// furthest away: nearer the things you pass over, as long as it still grows from the question
// you're holding and the picks differ from each other.

const PICK = 4;
/** Sharpness of the similarity kernel: higher means only close neighbours count as familiar. */
const KAPPA = 6;
/** How much staying on-topic matters next to getting away from your habits. Deliberately small. */
const RELEVANCE_WEIGHT = 0.12;
/** Below this similarity to the held question, a candidate has drifted off entirely. */
const RELEVANCE_FLOOR = 0.05;
/** How strongly each pick pushes the next ones to be different from it (maximal marginal relevance). */
const DIVERSITY = 0.35;
/** How much being like the things you skip pulls a candidate in. */
const SKIP_PULL = 0.6;

const dot = (a: number[], b: number[]) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const kernel = (cos: number) => Math.exp(KAPPA * (cos - 1));

function oneHot(t?: Territory): number[] {
  return TERRITORIES.map((x) => (x === t ? 1 : 0));
}

/** Recency-weighted density of `points` around `v`: how crowded that part of meaning-space is. */
function density(v: number[], points: number[][]): number {
  if (points.length === 0) return 0;
  let sum = 0;
  let total = 0;
  points.forEach((p, j) => {
    const w = Math.pow(FADE_PER_CHOICE, points.length - 1 - j);
    sum += w * kernel(dot(v, p));
    total += w;
  });
  return sum / total;
}

export type Selection = {
  chosen: (GeneratedQuestion & { against?: string })[];
  passedOver: GeneratedQuestion[];
  /** Whether meaning (the embedding model) was used, or tags alone. */
  byMeaning: boolean;
};

export async function selectAstray(input: {
  candidates: GeneratedQuestion[];
  held: string;
  /** Questions earlier in this fall: being near them counts as familiar too. */
  path: string[];
  habits: Habits;
  /** How long to wait for the model before steering by tags instead. */
  timeoutMs: number;
}): Promise<Selection> {
  const { candidates, held, path, habits } = input;
  const known = habits.choices >= 3;

  // Topic familiarity: how much of your recent choosing went to this candidate's territory.
  const lean = leanings(habits);
  const top = lean[0]?.share ?? 0;
  const territoryComfort = candidates.map((c) => {
    const share = lean.find((l) => l.territory === c.territory)?.share ?? 0;
    return top > 0 ? share / top : 0;
  });

  // Style familiarity: on each axis you lean on, 1 if the candidate is your usual kind, 0 if the opposite.
  const leanBy = styleLean(habits);
  const leanAxes = Object.keys(leanBy) as StyleAxis[];
  const styleComfort = candidates.map((c) => {
    if (!c.style || leanAxes.length === 0) return 0;
    let sum = 0;
    let weight = 0;
    for (const axis of leanAxes) {
      const value = c.style[axis];
      if (!value) continue;
      const l = leanBy[axis]!; // -1..1 towards the axis's second value
      const towards = value === STYLE_AXES[axis][1] ? l : -l;
      sum += Math.abs(l) * (towards + 1) / 2;
      weight += Math.abs(l);
    }
    return weight > 0 ? sum / weight : 0;
  });

  const grabs = habits.grabs;
  const skips = habits.skips;
  const vectors = await embed(
    [held, ...candidates.map((c) => c.text), ...grabs.map((g) => g.text), ...skips.map((s) => s.text), ...path],
    input.timeoutMs,
  );

  let comfort: number[];
  let relevance: number[];
  let space: number[][];

  if (vectors) {
    let i = 0;
    const heldV = vectors[i++];
    const candV = vectors.slice(i, (i += candidates.length));
    const grabV = vectors.slice(i, (i += grabs.length));
    const skipV = vectors.slice(i, (i += skips.length));
    const pathV = vectors.slice(i);

    comfort = candV.map((v, k) => {
      const nearPicks = density(v, grabV);
      const nearSkips = density(v, skipV);
      const nearPath = pathV.length ? Math.max(...pathV.map((p) => kernel(dot(v, p)))) : 0;
      return known
        ? 0.35 * nearPicks + 0.25 * styleComfort[k] + 0.2 * territoryComfort[k] + 0.2 * nearPath - SKIP_PULL * nearSkips
        : 0.7 * nearPath + 0.3 * territoryComfort[k];
    });
    relevance = candV.map((v) => dot(v, heldV));
    space = candV;
  } else {
    // No model (still downloading, data saver, or failed): steer by the AI's tags alone.
    comfort = candidates.map((_, k) => 0.55 * styleComfort[k] + 0.45 * territoryComfort[k]);
    relevance = candidates.map(() => RELEVANCE_FLOOR);
    space = candidates.map((c) => oneHot(c.territory));
  }

  const score = candidates.map((_, k) => -comfort[k] + RELEVANCE_WEIGHT * relevance[k]);
  let pool = candidates.map((_, k) => k).filter((k) => relevance[k] >= RELEVANCE_FLOOR);
  if (pool.length < PICK) pool = candidates.map((_, k) => k);

  const picked: number[] = [];
  while (picked.length < PICK && pool.length > 0) {
    let best = pool[0];
    let bestValue = -Infinity;
    for (const k of pool) {
      const sameness = picked.length ? Math.max(...picked.map((j) => dot(space[k], space[j]))) : 0;
      const value = score[k] - DIVERSITY * sameness;
      if (value > bestValue) {
        bestValue = value;
        best = k;
      }
    }
    picked.push(best);
    pool = pool.filter((k) => k !== best);
  }

  // Each question says something different about why it's here, rather than the same line four times.
  const used = new Set<string>();
  return {
    chosen: picked.map((k) => ({ ...candidates[k], against: known ? whyAgainst(candidates[k], habits, used) : undefined })),
    passedOver: candidates.filter((_, k) => !picked.includes(k)),
    byMeaning: Boolean(vectors),
  };
}

/** Every honest reason this question goes against your grain, most pointed first. */
function reasonsAgainst(q: GeneratedQuestion, habits: Habits): string[] {
  const leanBy = styleLean(habits);
  const unusual = (Object.keys(leanBy) as StyleAxis[])
    .filter((axis) => Math.abs(leanBy[axis]!) >= 0.25)
    .sort((a, b) => Math.abs(leanBy[b]!) - Math.abs(leanBy[a]!))
    .flatMap((axis) => {
      const value = q.style?.[axis];
      const yourSide = STYLE_AXES[axis][leanBy[axis]! > 0 ? 1 : 0];
      return value && value !== yourSide ? [value] : [];
    });
  const reasons: string[] = [];
  const share = leanings(habits).find((l) => l.territory === q.territory)?.share ?? 0;
  if (q.territory && share < 0.08) reasons.push(`you never go near ${q.territory}`);
  unusual.forEach((v) => reasons.push(`you usually skip ${v} ones`));
  if (unusual.length >= 2) reasons.push(`you usually skip ${unusual[0]}, ${unusual[1]} ones`);
  return reasons;
}

/** A short reason for this question, preferring one the other questions in the set haven't used. */
function whyAgainst(q: GeneratedQuestion, habits: Habits, used: Set<string>): string | undefined {
  const reasons = reasonsAgainst(q, habits);
  const reason = reasons.find((r) => !used.has(r)) ?? reasons[0];
  if (reason) used.add(reason);
  return reason;
}
