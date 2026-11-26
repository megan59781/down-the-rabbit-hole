"use client";

import { useEffect, useRef, useState } from "react";
import { EXAMPLE_PROMPTS } from "@/lib/content/examplePrompts";

/** Shown first on the server and the client alike (no hydration mismatch), then typing takes over. */
export const FIRST_PROMPT = "Why do cats knock things off tables?";

const TYPE_MS = 55;
const DELETE_MS = 22;
const HOLD_MS = 2200;
const GAP_MS = 350;

/** A different question, and not one already showing as an example underneath. */
function nextPrompt(current: string, avoid: readonly string[]): string {
  const pool = EXAMPLE_PROMPTS.filter((p) => p !== current && !avoid.includes(p));
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * A placeholder that types itself out: a question, a pause, backspaced away, then another.
 * Stops while `active` is false (e.g. the person has started typing) and stays still for
 * reduced motion.
 */
export function useTypewriter(active: boolean, reduce: boolean, avoid: readonly string[] = []): string {
  const [text, setText] = useState(FIRST_PROMPT);
  const showing = useRef(FIRST_PROMPT);
  // Read when picking the next question, so the examples rotating doesn't restart the typing.
  const avoidRef = useRef(avoid);
  useEffect(() => {
    avoidRef.current = avoid;
  }, [avoid]);

  useEffect(() => {
    if (!active || reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    // Resume from whatever is showing (it may be mid-word if typing was paused).
    let target = showing.current;
    let shown = target.length;
    let phase: "hold" | "delete" | "type" = "hold";
    if (shown === 0) {
      target = nextPrompt(target, avoidRef.current);
      phase = "type";
    }
    const show = (value: string) => {
      showing.current = value;
      setText(value);
    };

    const tick = () => {
      if (phase === "hold") {
        phase = "delete";
        timer = setTimeout(tick, HOLD_MS);
      } else if (phase === "delete") {
        if (shown > 0) {
          shown--;
          show(target.slice(0, shown));
          timer = setTimeout(tick, DELETE_MS);
        } else {
          target = nextPrompt(target, avoidRef.current);
          phase = "type";
          timer = setTimeout(tick, GAP_MS);
        }
      } else if (shown < target.length) {
        shown++;
        show(target.slice(0, shown));
        // A little unevenness so it reads like someone typing, not a ticker.
        timer = setTimeout(tick, TYPE_MS + Math.random() * 45);
      } else {
        phase = "hold";
        tick();
      }
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [active, reduce]);

  return reduce ? FIRST_PROMPT : text;
}
