"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/branding/Logo";
import { useFallAudio } from "@/lib/audio/useFallAudio";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { getNode, pathTo, risingFrom } from "@/lib/session/tree";
import { growKey, useExplorationSession } from "@/lib/session/useExplorationSession";
import type { ExplorationMode, QuestionNode } from "@/lib/types";
import { GravityToggle } from "./GravityToggle";
import { LookUp } from "./LookUp";
import { Tunnel } from "./Tunnel";

/** Where the hole's vanishing point sits, in % of the stage. */
const VANISH = { x: 50, y: 48 };
const DIVE_MS = 650;

const GLOW = { deeper: "156 203 255", stranger: "229 162 232" } as const;

function subscribeNarrow(cb: () => void) {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
const isNarrow = () => window.matchMedia("(max-width: 639px)").matches;

/** Resting spots for the rising questions; Stranger tilts the whole arrangement off-axis. */
function slotsFor(mode: ExplorationMode, narrow: boolean) {
  const base = narrow
    ? [
        [28, 17],
        [72, 28],
        [28, 67],
        [72, 79],
      ]
    : [
        [21, 22],
        [79, 25],
        [19, 73],
        [81, 71],
      ];
  if (mode === "deeper") return base.map(([x, y]) => ({ x, y }));
  const angle = (-13 * Math.PI) / 180;
  return base.map(([x, y]) => {
    const dx = x - VANISH.x;
    const dy = y - VANISH.y;
    return {
      x: Math.min(88, Math.max(12, VANISH.x + dx * Math.cos(angle) - dy * Math.sin(angle))),
      y: Math.min(90, Math.max(10, VANISH.y + dx * Math.sin(angle) + dy * Math.cos(angle))),
    };
  });
}

export function FallView({ sessionId }: { sessionId: string }) {
  const controller = useExplorationSession(sessionId);
  const { session, pending, errors } = controller;
  const reduce = Boolean(useReducedMotion());
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const [diving, setDiving] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [lookingUp, setLookingUp] = useState(false);
  const [hasDived, setHasDived] = useState(false);
  const started = useRef(false);
  const sound = useFallAudio(session?.mode ?? "deeper");

  // A faint twinkle each time a new set of questions starts rising.
  const risingKey = session ? risingFrom(session, session.focusId, session.mode).map((q) => q.id).join() : "";
  const { sparkle } = sound;
  useEffect(() => {
    if (risingKey) sparkle();
    // Only on a new set, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risingKey]);

  // Start falling: make the first questions rise as soon as the view opens.
  useEffect(() => {
    if (!session || started.current) return;
    const timer = setTimeout(() => {
      started.current = true;
      controller.ensureRising(session.focusId);
    }, 0);
    return () => clearTimeout(timer);
  }, [session, controller]);

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <RabbitIcon portal className="h-16 w-16 text-soft/70" />
        <h1 className="font-serif text-3xl text-soft">This hole has closed over.</h1>
        <p className="max-w-sm text-muted">We couldn&rsquo;t find this fall. It may have been cleared from this browser.</p>
        <Link href="/" className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight">
          Ask a new question →
        </Link>
      </div>
    );
  }

  const focus = getNode(session, session.focusId)!;
  const mode = session.mode;
  const rising = risingFrom(session, focus.id, mode);
  const key = growKey(focus.id, mode);
  const growing = Boolean(pending[key]);
  const error = errors[key];
  const depth = pathTo(session, focus.id).length - 1;
  const slots = slotsFor(mode, narrow);

  const grab = (id: string) => {
    if (diving) return;
    setDiving(id);
    setBurst((b) => b + 1);
    sound.whoosh();
    sound.chime(mode);
    setHasDived(true);
    setTimeout(() => {
      controller.dive(id);
      setDiving(null);
    }, reduce ? 150 : DIVE_MS);
  };

  const jump = (id: string) => {
    setLookingUp(false);
    setBurst((b) => b + 1);
    sound.whoosh();
    controller.dive(id);
  };

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-midnight">
      <header className="relative z-30 flex items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <Link href="/" aria-label="Back to the start" className="shrink-0">
          <span className="hidden sm:block">
            <Logo />
          </span>
          <span className="sm:hidden">
            <Logo compact />
          </span>
        </Link>
        <GravityToggle mode={mode} onChange={controller.setMode} />
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={sound.toggleSound}
            aria-pressed={sound.soundOn}
            aria-label={sound.soundOn ? "Turn sound off" : "Turn sound on"}
            title={sound.soundOn ? "Sound on" : "Sound off"}
            className={clsx(
              "grid h-8 w-8 place-items-center rounded-full border bg-midnight/60 text-sm backdrop-blur transition",
              sound.soundOn ? "border-lavender/60 text-soft" : "border-white/15 text-muted hover:text-soft",
            )}
          >
            <span aria-hidden>{sound.soundOn ? "🔊" : "🔇"}</span>
          </button>
          <button
            type="button"
            onClick={() => setLookingUp(true)}
            className="rounded-full border border-white/15 bg-midnight/60 px-3 py-1.5 text-xs text-soft backdrop-blur hover:border-lavender/60"
          >
            ↑ Look up
          </button>
          <Link
            href="/"
            className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:text-soft sm:inline-block"
          >
            New question
          </Link>
        </div>
      </header>

      <main className="absolute inset-0">
        <Tunnel mode={mode} burst={burst} paused={lookingUp} onSpeed={sound.setSpeed} />
        <RabbitSightings reduce={reduce} />

        {/* The question you're holding, at the heart of the hole. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={focus.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.35, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.6, filter: "blur(12px)" }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease: "easeOut" }}
              className="max-w-[80vw] text-center sm:max-w-xl"
              style={{ marginTop: "-4dvh" }}
            >
              <p className="text-[0.65rem] tracking-[0.3em] text-muted uppercase">
                {depth === 0 ? "You're holding" : `${depth} down · you're holding`}
              </p>
              <h1
                className="mt-3 font-serif text-2xl leading-tight text-soft sm:text-4xl"
                style={{ textShadow: `0 0 30px rgb(${GLOW[focus.mode]} / 0.35)` }}
              >
                {focus.text}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Questions rising out of the dark. */}
        <AnimatePresence>
          <motion.div
            key={`${focus.id}:${mode}`}
            className="absolute inset-0"
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            {rising.map((q, i) => (
              <RisingQuestion
                key={q.id}
                node={q}
                slot={slots[i % slots.length]}
                index={i}
                state={diving === null ? "idle" : diving === q.id ? "chosen" : "passed"}
                reduce={reduce}
                onGrab={() => grab(q.id)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Status and controls along the bottom. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-4 pb-5">
          {error ? (
            <p role="alert" className="pointer-events-auto text-sm text-pink">
              {error}{" "}
              <button type="button" onClick={() => controller.grow(focus.id, mode)} className="underline underline-offset-4">
                Try again
              </button>
            </p>
          ) : growing ? (
            <p className="text-sm text-muted italic animate-pulse">
              {mode === "deeper" ? "Questions are rising from below…" : "Something strange is drifting in…"}
            </p>
          ) : !hasDived && rising.length > 0 ? (
            <p className="text-xs text-muted/80">Tap a question to fall into it · scroll to fall faster</p>
          ) : null}
          {rising.length > 0 && !growing ? (
            <button
              type="button"
              onClick={() => controller.grow(focus.id, mode)}
              className="pointer-events-auto rounded-full border border-white/10 bg-midnight/50 px-3 py-1 text-xs text-muted backdrop-blur hover:text-soft"
            >
              ↻ Let others rise
            </button>
          ) : null}
        </div>
      </main>

      <AnimatePresence>
        {lookingUp ? <LookUp session={session} onJump={jump} onClose={() => setLookingUp(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}

type RisingQuestionProps = {
  node: QuestionNode;
  slot: { x: number; y: number };
  index: number;
  state: "idle" | "chosen" | "passed";
  reduce: boolean;
  onGrab: () => void;
};

/** A question floating up out of the hole. Grab it and you fall into it; the rest rush past. */
function RisingQuestion({ node, slot, index, state, reduce, onGrab }: RisingQuestionProps) {
  const glow = GLOW[node.mode];
  const target =
    state === "chosen"
      ? { left: `${VANISH.x}%`, top: `${VANISH.y}%`, scale: 1.5, opacity: 0 }
      : state === "passed"
        ? {
            left: `${VANISH.x + (slot.x - VANISH.x) * 2.4}%`,
            top: `${VANISH.y + (slot.y - VANISH.y) * 2.4}%`,
            scale: 2.2,
            opacity: 0,
          }
        : // Stay invisible for the first half of the rise so questions never pile up over the centre.
          { left: `${slot.x}%`, top: `${slot.y}%`, scale: 1, opacity: reduce ? 1 : [0, 0, 1] };

  return (
    <motion.button
      type="button"
      onClick={onGrab}
      disabled={state !== "idle"}
      initial={
        reduce
          ? { left: `${slot.x}%`, top: `${slot.y}%`, opacity: 0 }
          : {
              // Emerge a little way out from the vanishing point, already heading for its own spot.
              left: `${VANISH.x + (slot.x - VANISH.x) * 0.25}%`,
              top: `${VANISH.y + (slot.y - VANISH.y) * 0.25}%`,
              scale: 0.15,
              opacity: 0,
            }
      }
      animate={target}
      transition={
        state === "idle"
          ? {
              duration: reduce ? 0.3 : 1.6,
              delay: reduce ? 0 : 0.15 + index * 0.25,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: reduce ? 0.3 : 1.6, delay: reduce ? 0 : 0.15 + index * 0.25, times: [0, 0.35, 1] },
            }
          : { duration: 0.6, ease: "easeIn" }
      }
      whileHover={state === "idle" ? { scale: 1.07 } : undefined}
      className="group absolute z-10 w-[44vw] max-w-[19rem] -translate-x-1/2 -translate-y-1/2 text-center focus-visible:outline-none"
    >
      {/* A slow, lazy drift: a small figure-of-eight with a gentle breath, offset per question. */}
      <motion.span
        className="relative block"
        animate={
          reduce
            ? undefined
            : {
                x: [0, 10, 0, -10, 0].map((v) => (index % 2 ? -v : v)),
                y: [0, -9, 0, 9, 0],
                rotate: [0, index % 2 ? 1.5 : -1.5, 0, index % 2 ? -1 : 1, 0],
                scale: [1, 1.03, 1, 1.02, 1],
              }
        }
        transition={{ duration: 9 + index * 1.3, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Soft darkness behind the words so the tunnel lines never cut through them. */}
        <span
          aria-hidden
          className="absolute -inset-x-6 -inset-y-5 -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgb(10_8_18/0.88),rgb(10_8_18/0.55)_60%,transparent)]"
        />
        <span
          className="block font-display text-base leading-snug font-medium text-white transition group-focus-visible:underline sm:text-xl"
          style={{
            textShadow: `0 1px 3px rgb(10 8 18 / 0.9), 0 0 22px rgb(${glow} / 0.45)`,
          }}
        >
          <span aria-hidden style={{ color: `rgb(${glow})` }}>
            ?{" "}
          </span>
          {node.text}
        </span>
        {node.whisper ? (
          <span
            className="mt-1.5 block text-xs text-soft/75 italic transition group-hover:text-soft sm:text-sm"
            style={{ textShadow: "0 1px 3px rgb(10 8 18 / 0.9)" }}
          >
            {node.whisper}
          </span>
        ) : null}
      </motion.span>
    </motion.button>
  );
}

/** Every so often the rabbit flashes past, just ahead of you. */
function RabbitSightings({ reduce }: { reduce: boolean }) {
  const [sighting, setSighting] = useState<{ key: number; angle: number } | null>(null);

  useEffect(() => {
    if (reduce) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        setSighting({ key: Date.now(), angle: Math.random() * Math.PI * 2 });
        schedule(14000 + Math.random() * 12000);
      }, delay);
    };
    schedule(6000);
    return () => clearTimeout(timer);
  }, [reduce]);

  if (!sighting) return null;
  return (
    <motion.div
      key={sighting.key}
      aria-hidden
      className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 text-soft"
      initial={{ left: `${VANISH.x}%`, top: `${VANISH.y}%`, scale: 0.2, opacity: 0, rotate: 0 }}
      animate={{
        left: `${VANISH.x + Math.cos(sighting.angle) * 70}%`,
        top: `${VANISH.y + Math.sin(sighting.angle) * 70}%`,
        scale: 2.4,
        opacity: [0, 0.8, 0],
        rotate: sighting.angle > Math.PI ? -25 : 25,
      }}
      transition={{ duration: 1.5, ease: "easeIn" }}
    >
      <RabbitIcon className={clsx("h-10 w-10")} />
    </motion.div>
  );
}
