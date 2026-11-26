"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { RabbitIcon } from "@/components/branding/RabbitIcon";

export const TOURED_KEY = "rabbit-hole:toured";

type Step = {
  /** `data-tour` value of the element to spotlight; none means a card in the middle. */
  target?: string;
  title: string;
  body: string;
  rabbit?: boolean;
};

const STEPS: Step[] = [
  {
    target: "held",
    title: "The question you're holding",
    body: "Down here you never get answers. Only more questions.",
  },
  {
    target: "rising",
    title: "Questions rise",
    body: "They float up out of the dark. Tap one to fall into it.",
  },
  {
    target: "toggle",
    title: "Pick a direction",
    body: "Deeper digs underneath. Stranger tips sideways. Astray steers you away from your habits.",
  },
  {
    title: "Fall your way",
    body: "Scroll or swipe to fall faster. On a phone, tilt to steer.",
  },
  {
    title: "Catch the rabbit",
    body: "Now and then it flashes past. Catch it and it asks you something only you can answer.",
    rabbit: true,
  },
  {
    target: "lookup",
    title: "Look up",
    body: "See the path you fell, and what the rabbit has learnt about you.",
  },
  {
    target: "sound",
    title: "Sound",
    body: "The fall has its own sound. Turn it on if you like.",
  },
];

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 10;
const CARD_W = 300;

export function markToured() {
  try {
    window.localStorage.setItem(TOURED_KEY, "1");
  } catch {
    // Fine: it may be offered again next time.
  }
}

/** A short spotlight walkthrough of the fall. Escape skips; arrow keys move between steps. */
export function Tour({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const card = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const finish = useCallback(() => {
    markToured();
    onDone();
  }, [onDone]);

  // Follow the target every frame: the questions drift and the hole leans as you steer.
  useEffect(() => {
    let raf = 0;
    let prev = "";
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      const r = el?.getBoundingClientRect();
      const next = r && r.width > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
      const key = next
        ? `${Math.round(next.x)},${Math.round(next.y)},${Math.round(next.w)},${Math.round(next.h)}`
        : "none";
      const vp = `${window.innerWidth}x${window.innerHeight}`;
      if (key + vp !== prev) {
        prev = key + vp;
        setRect(next);
        setViewport({ w: window.innerWidth, h: window.innerHeight });
      }
      raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  useEffect(() => {
    card.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  // Put the card below the spotlight if there's room, otherwise above; centred if there's no target.
  const cardW = Math.min(CARD_W, viewport.w - 32);
  // No target: centred by the wrapper below (a transform here would fight the card's slide-in).
  let cardStyle: CSSProperties = { width: cardW };
  if (rect && viewport.w) {
    const left = Math.min(Math.max(rect.x + rect.w / 2 - cardW / 2, 16), viewport.w - cardW - 16);
    const below = rect.y + rect.h + PAD + 12;
    const roomBelow = viewport.h - below > 190;
    cardStyle = roomBelow
      ? { width: cardW, left, top: below }
      : { width: cardW, left, bottom: viewport.h - (rect.y - PAD - 12) };
  }

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* The dimmed hole, with a soft spotlight cut around whatever this step is about. */}
      {rect ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute rounded-3xl border border-lavender/60 shadow-[0_0_0_9999px_rgb(4_3_10/0.72),0_0_40px_rgb(183_154_255/0.45)]"
          animate={{
            left: rect.x - PAD,
            top: rect.y - PAD,
            width: rect.w + PAD * 2,
            height: rect.h + PAD * 2,
          }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgb(4_3_10/0.72)]" />
      )}

      <div className={rect ? undefined : "pointer-events-none absolute inset-0 grid place-items-center"}>
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            ref={card}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={clsx(
              "pointer-events-auto rounded-2xl border border-white/15 bg-midnight-2/95 p-4 shadow-[0_0_40px_-10px_rgb(183_154_255/0.6)] focus:outline-none",
              rect && "absolute",
            )}
            style={cardStyle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start gap-3">
              {step.rabbit ? (
                <RabbitIcon className="h-9 w-9 shrink-0 text-soft drop-shadow-[0_0_10px_rgb(183_154_255/0.9)]" />
              ) : null}
              <div>
                <p id={titleId} className="font-display text-sm font-semibold text-soft">
                  {step.title}
                </p>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-xs text-muted/70 tabular-nums">
                {index + 1} / {STEPS.length}
              </span>
              <div className="flex items-center gap-1">
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={finish}
                    className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-soft"
                  >
                    Skip
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIndex((i) => i - 1)}
                    className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-soft"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => (last ? finish() : setIndex((i) => i + 1))}
                  className="rounded-full bg-lavender px-4 py-1.5 font-display text-xs font-semibold text-midnight hover:bg-soft"
                >
                  {last ? "Start falling ↓" : "Next"}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
