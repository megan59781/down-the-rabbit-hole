"use client";

import { useSyncExternalStore } from "react";
import { embedderState, subscribeEmbedder } from "@/lib/astray/embedder";
import { forgetHabits, getHabits, getServerHabits, leanings, narrowness, styleLean, subscribeHabits } from "@/lib/astray/habits";
import { STYLE_AXES, type StyleAxis } from "@/lib/astray/territories";

const MODEL_TEXT = {
  idle: "Steering by territory. Go Astray once to switch on meaning.",
  loading: "Downloading the meaning model (once, then it's cached).",
  ready: "Steering by meaning, on this device.",
  failed: "Steering by territory (the meaning model couldn't load).",
} as const;

/**
 * What the hole thinks you like, shown plainly. An algorithm that hides its model of you is
 * the thing this is against, so this one shows its working and lets you wipe it.
 */
export function HabitMirror() {
  const habits = useSyncExternalStore(subscribeHabits, getHabits, getServerHabits);
  const model = useSyncExternalStore(subscribeEmbedder, embedderState, () => "idle" as const);
  const lean = leanings(habits).slice(0, 6);
  const narrow = narrowness(habits);
  const style = Object.entries(styleLean(habits)) as [StyleAxis, number][];

  return (
    <section aria-label="Your habits" className="mt-12 w-full max-w-md rounded-2xl border border-lavender/25 bg-midnight-2/60 p-5">
      <p className="font-display text-xs tracking-[0.3em] text-lavender uppercase">⇝ What the hole thinks you like</p>
      {lean.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Nothing yet. Every question you grab teaches it a little.</p>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {lean.map((l) => (
              <li key={l.territory} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-soft capitalize">{l.territory}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-lavender" style={{ width: `${Math.round(l.share * 100)}%` }} />
                </span>
                <span className="w-9 text-right text-xs text-muted tabular-nums">{Math.round(l.share * 100)}%</span>
              </li>
            ))}
          </ul>
          {style.length ? (
            <ul className="mt-5 flex flex-col gap-2" aria-label="The kind of questions you pick">
              {style.map(([axis, lean]) => {
                const [left, right] = STYLE_AXES[axis];
                return (
                  <li key={axis} className="flex items-center gap-2 text-xs">
                    <span className={lean < -0.25 ? "w-16 text-right text-soft" : "w-16 text-right text-muted"}>{left}</span>
                    <span className="relative h-1.5 flex-1 rounded-full bg-white/10">
                      <span aria-hidden className="absolute top-1/2 left-1/2 h-3 w-px -translate-y-1/2 bg-white/20" />
                      <span
                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lavender shadow-[0_0_8px_rgb(183_154_255/0.8)]"
                        style={{ left: `${50 + lean * 50}%` }}
                      />
                    </span>
                    <span className={lean > 0.25 ? "w-16 text-soft" : "w-16 text-muted"}>{right}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <p className="mt-4 text-xs text-muted">
            {narrow > 0.5
              ? "You're quite set in your ways. Astray will push hard."
              : narrow > 0.25
                ? "You have favourites. Astray leans away from them."
                : "You roam widely. Astray has to work to surprise you."}
          </p>
        </>
      )}
      <p className="mt-2 text-xs text-muted/70">{MODEL_TEXT[model]} Kept only in this browser.</p>
      {lean.length > 0 ? (
        <button
          type="button"
          onClick={forgetHabits}
          className="mt-4 rounded-full border border-white/15 px-3 py-1 text-xs text-muted hover:text-soft"
        >
          Forget my habits
        </button>
      ) : null}
    </section>
  );
}
