"use client";

import {
  STYLE_AXES,
  TERRITORIES,
  styleValues,
  type Style,
  type StyleAxis,
  type StyleValue,
  type Territory,
} from "./territories";

// What the hole has learned about your habits, from every question you grab in any direction:
// the topics and the kinds of question you reach for, and the ones you pass over.
// Kept only in this browser. Shown to you in "Look up", and you can wipe it at any time.

const KEY = "rabbit-hole:habits:v1";
const MAX_REMEMBERED = 40;
/** Each new choice fades the old ones a little: habits are what you do lately, not ever. */
export const FADE_PER_CHOICE = 0.9;
/** Passing over a question you were offered counts a little against what it was. */
const PASS_WEIGHT = 0.25;

type Seen = { text: string; territory?: Territory; style?: Style; at: number };
export type Habits = {
  grabs: Seen[];
  /** Questions you were offered and passed over: the anti-feed leans towards these. */
  skips: Seen[];
  weights: Partial<Record<Territory, number>>;
  styleWeights: Partial<Record<StyleValue, number>>;
  choices: number;
};

const EMPTY: Habits = { grabs: [], skips: [], weights: {}, styleWeights: {}, choices: 0 };
let current: Habits | null = null;
const listeners = new Set<() => void>();

function read(): Habits {
  if (current) return current;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<Habits>) : null;
    // Older saves had no skips or styles: fill them in rather than throwing habits away.
    current =
      parsed && Array.isArray(parsed.grabs) && parsed.weights
        ? { ...EMPTY, ...parsed, skips: parsed.skips ?? [], styleWeights: parsed.styleWeights ?? {} }
        : EMPTY;
  } catch {
    current = EMPTY;
  }
  return current;
}

function write(next: Habits) {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: habits still work for this visit.
  }
  listeners.forEach((l) => l());
}

export const getHabits = () => (typeof window === "undefined" ? EMPTY : read());
export const getServerHabits = () => EMPTY;
export function subscribeHabits(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Fade every weight, then add `plus` to the chosen keys and take `minus` off the passed ones. */
function update<K extends string>(
  weights: Partial<Record<K, number>>,
  keys: readonly K[],
  chosen: K[],
  passed: K[],
): Partial<Record<K, number>> {
  const next: Partial<Record<K, number>> = {};
  for (const k of keys) {
    const w = (weights[k] ?? 0) * FADE_PER_CHOICE;
    if (w > 0.01) next[k] = w;
  }
  for (const k of chosen) next[k] = (next[k] ?? 0) + 1;
  for (const k of passed) if (!chosen.includes(k) && next[k]) next[k] = Math.max(0, next[k]! - PASS_WEIGHT);
  return next;
}

type Offered = { text: string; territory?: Territory; style?: Style };

/** You grabbed `chosen` while `passed` were also on offer. */
export function recordChoice(chosen: Offered, passed: Offered[]) {
  const h = read();
  const now = Date.now();
  write({
    grabs: [...h.grabs, { ...pick(chosen), at: now }].slice(-MAX_REMEMBERED),
    skips: [...h.skips, ...passed.map((p) => ({ ...pick(p), at: now }))].slice(-MAX_REMEMBERED),
    weights: update(
      h.weights,
      TERRITORIES,
      chosen.territory ? [chosen.territory] : [],
      passed.flatMap((p) => (p.territory ? [p.territory] : [])),
    ),
    styleWeights: update(
      h.styleWeights,
      Object.values(STYLE_AXES).flat() as StyleValue[],
      styleValues(chosen.style),
      passed.flatMap((p) => styleValues(p.style)),
    ),
    choices: h.choices + 1,
  });
}

const pick = ({ text, territory, style }: Offered) => ({ text, territory, style });

export function forgetHabits() {
  write(EMPTY);
}

/** Territories you lean towards, strongest first, with their share of your recent choices. */
export function leanings(h: Habits): { territory: Territory; share: number }[] {
  const entries = Object.entries(h.weights) as [Territory, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  if (total <= 0) return [];
  return entries
    .map(([territory, w]) => ({ territory, share: w / total }))
    .filter((e) => e.share > 0.02)
    .sort((a, b) => b.share - a.share);
}

/**
 * Your lean on each style axis, -1..1 towards its second value (e.g. tone: -1 = always playful,
 * +1 = always serious). Axes you've shown no preference on are left out.
 */
export function styleLean(h: Habits): Partial<Record<StyleAxis, number>> {
  const lean: Partial<Record<StyleAxis, number>> = {};
  for (const [axis, [a, b]] of Object.entries(STYLE_AXES) as [StyleAxis, readonly [StyleValue, StyleValue]][]) {
    const wa = h.styleWeights[a] ?? 0;
    const wb = h.styleWeights[b] ?? 0;
    if (wa + wb > 0.5) lean[axis] = (wb - wa) / (wa + wb);
  }
  return lean;
}

/** The style values you clearly lean towards, strongest first, e.g. ["playful", "small"]. */
export function styleHabits(h: Habits, threshold = 0.3): StyleValue[] {
  if (h.choices < 3) return [];
  return (Object.entries(styleLean(h)) as [StyleAxis, number][])
    .filter(([, v]) => Math.abs(v) >= threshold)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
    .map(([axis, v]) => STYLE_AXES[axis][v > 0 ? 1 : 0]);
}

/**
 * How set in your ways you are, 0..1: one minus the normalised entropy of your topic leanings,
 * blended with how one-sided your style is.
 */
export function narrowness(h: Habits): number {
  const l = leanings(h);
  if (l.length === 0 || h.choices < 3) return 0;
  const entropy = -l.reduce((sum, e) => sum + e.share * Math.log(e.share), 0);
  const topic = Math.max(0, Math.min(1, 1 - entropy / Math.log(TERRITORIES.length)));
  const axes = Object.values(styleLean(h));
  const style = axes.length ? axes.reduce((sum, v) => sum + Math.abs(v), 0) / axes.length : 0;
  return 0.5 * topic + 0.5 * style;
}

/** The territories worth steering away from: clear favourites only. */
export function habitTerritories(h: Habits, max = 3): Territory[] {
  if (h.choices < 3) return [];
  return leanings(h)
    .filter((e) => e.share >= 0.18)
    .slice(0, max)
    .map((e) => e.territory);
}

/** What the AI is told in Astray: your style lean and a handful of recent picks and skips. */
export function astrayProfile(h: Habits) {
  if (h.choices < 2) return undefined;
  return {
    leans: styleHabits(h),
    picks: h.grabs.slice(-5).map((g) => g.text),
    skips: h.skips.slice(-5).map((s) => s.text),
  };
}
