"use client";

import { AnimatePresence, motion, useReducedMotion, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { warmEmbedder } from "@/lib/astray/embedder";
import { appeal, getHabits, recordChoice } from "@/lib/astray/habits";
import { useFallAudio } from "@/lib/audio/useFallAudio";
import { childrenOf, getNode, pathTo, risingFrom } from "@/lib/session/tree";
import { growKey, useExplorationSession } from "@/lib/session/useExplorationSession";
import type { QuestionNode } from "@/lib/types";
import { AstrayGhosts } from "./AstrayGhosts";
import { CareNote } from "./CareNote";
import { CLIMB_MS, ClimbOut } from "./ClimbOut";
import { FallControls } from "./FallControls";
import { FallHeader } from "./FallHeader";
import { HeldQuestion } from "./HeldQuestion";
import { LookUp } from "./LookUp";
import { RabbitAsks } from "./RabbitAsks";
import { RabbitSightings } from "./RabbitSightings";
import { RisingQuestion } from "./RisingQuestion";
import { DIVE_MS, slotsFor } from "./stage";
import { TOURED_KEY, Tour } from "./Tour";
import { Tunnel } from "./Tunnel";
import { useFallHabits } from "./useFallHabits";
import { useSteer } from "./useSteer";

function subscribeNarrow(cb: () => void) {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}
const isNarrow = () => window.matchMedia("(max-width: 639px)").matches;

/**
 * The fall: holds the state of one exploration (what you're holding, which questions are rising,
 * which overlay is open) and arranges the pieces. On phones the questions stack, so nothing can
 * ever overlap; wider screens scatter them around the hole.
 */
export function FallView({ sessionId }: { sessionId: string }) {
  const controller = useExplorationSession(sessionId);
  const { session, pending, errors } = controller;
  const reduce = Boolean(useReducedMotion());
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);
  const router = useRouter();

  const [diving, setDiving] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [hasDived, setHasDived] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [rabbitOpen, setRabbitOpen] = useState(false);
  const [touring, setTouring] = useState(false);
  const [climbing, setClimbing] = useState(false);
  // The tour is offered at the start of each new fall until you've taken it; ? brings it back.
  const [offerTour, setOfferTour] = useState(false);
  const started = useRef(false);
  // The plunge into a grabbed question finishes on a timer; leaving cancels it.
  const diveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sound = useFallAudio(session?.mode ?? "deeper");
  const steering = useSteer(!reduce);
  // Parallax: the questions drift against your steering, the held question gently with it.
  const risingX = useTransform(steering.x, (v) => v * -22);
  const risingY = useTransform(steering.y, (v) => v * -16);
  const heldX = useTransform(steering.x, (v) => v * 8);
  const heldY = useTransform(steering.y, (v) => v * 6);
  const { habitLine, push } = useFallHabits(session ? getNode(session, session.focusId)?.territory : undefined);

  useEffect(() => {
    router.prefetch("/");
  }, [router]);

  // This page is kept alive in the background after you leave (cacheComponents), and its effects
  // re-run each time it's shown again: make sure you arrive falling, not mid-climb.
  useEffect(() => {
    const timer = setTimeout(() => {
      setClimbing(false);
      setDiving(null); // a dive cut short by leaving shouldn't leave the questions frozen
    }, 0);
    return () => {
      clearTimeout(timer);
      if (diveTimer.current) clearTimeout(diveTimer.current);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setOfferTour(window.localStorage.getItem(TOURED_KEY) !== "1");
      } catch {
        setOfferTour(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const endTour = useCallback(() => setTouring(false), []);

  // The embedding model only downloads once you actually go astray.
  const inAstray = session?.mode === "astray";
  useEffect(() => {
    if (inAstray) warmEmbedder();
  }, [inAstray]);

  // A faint plink for each question as it starts rising (they stream in one by one).
  const risingIds = session ? risingFrom(session, session.focusId, session.mode).map((q) => q.id) : [];
  const risingKey = risingIds.join();
  const seenRising = useRef(new Set<string>());
  const { sparkle } = sound;
  useEffect(() => {
    const fresh = risingIds.filter((id) => !seenRising.current.has(id));
    fresh.forEach((id) => seenRising.current.add(id));
    if (fresh.length) sparkle(fresh.length);
    // Only when the rising set changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risingKey]);

  // Once the questions have risen, quietly grow what lies beneath each, so diving is instant.
  const focusGrowing = session ? Boolean(pending[growKey(session.focusId, session.mode)]) : false;
  const { prefetch } = controller;
  useEffect(() => {
    if (!session || focusGrowing || risingIds.length === 0) return;
    // Deeper and Stranger grow the ones you'll most likely grab first, so your kind of question
    // opens instantly: the soft pull of a feed. Astray doesn't play favourites.
    const order =
      session.mode === "astray"
        ? risingIds
        : [...risingIds].sort((a, b) => {
            const h = getHabits();
            return appeal(h, getNode(session, b) ?? {}) - appeal(h, getNode(session, a) ?? {});
          });
    const timer = setTimeout(() => prefetch(order, session.mode), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risingKey, focusGrowing, prefetch]);

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
  const depth = pathTo(session, focus.id).length - 1;
  const slots = slotsFor(mode);
  // Each question keeps the slot of the one it replaces, so new ones streaming in never shuffle the rest.
  const sameMode = childrenOf(session, focus.id).filter((n) => n.mode === mode && n.answer === undefined);
  const slotOf = (q: QuestionNode) => sameMode.indexOf(q) % slots.length;

  const grab = (id: string) => {
    if (diving) return;
    const chosen = rising.find((q) => q.id === id);
    if (chosen) recordChoice(chosen, rising.filter((q) => q.id !== id));
    setDiving(id);
    setBurst((b) => b + 1);
    sound.whoosh();
    sound.chime(mode);
    setHasDived(true);
    diveTimer.current = setTimeout(
      () => {
        diveTimer.current = null;
        controller.dive(id);
        setDiving(null);
      },
      reduce ? 150 : DIVE_MS,
    );
  };

  // You caught the rabbit: the fall holds still while it asks you something.
  const catchRabbit = () => {
    setRabbitOpen(true);
    sound.chime(mode);
  };

  // Your answer becomes the next step down, and new questions grow from it.
  const fallIntoAnswer = (asked: string, said: string) => {
    setRabbitOpen(false);
    setBurst((b) => b + 1);
    sound.whoosh();
    setHasDived(true);
    controller.answerRabbit(asked, said);
  };

  const climbOut = (e: MouseEvent<HTMLAnchorElement>) => {
    // New-tab and other modified clicks behave like an ordinary link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (climbing) return;
    // Leaving mid-dive: don't finish the dive behind your back.
    if (diveTimer.current) clearTimeout(diveTimer.current);
    if (reduce) return router.push("/");
    setClimbing(true);
    sound.whoosh();
    setTimeout(() => router.push("/"), CLIMB_MS);
  };

  const jump = (id: string) => {
    setLookingUp(false);
    setBurst((b) => b + 1);
    sound.whoosh();
    controller.dive(id);
  };

  const startTour = () => {
    setOfferTour(false);
    setTouring(true);
  };

  const held = <HeldQuestion focus={focus} depth={depth} narrow={narrow} reduce={reduce} />;

  const risingQuestion = (q: QuestionNode) => (
    <RisingQuestion
      key={q.id}
      node={q}
      slot={slots[slotOf(q)]}
      index={slotOf(q)}
      flow={narrow}
      tour={slotOf(q) === 0}
      state={diving === null ? "idle" : diving === q.id ? "chosen" : "passed"}
      reduce={reduce}
      onGrab={() => grab(q.id)}
    />
  );

  const controls = (className: string) => (
    <FallControls
      className={className}
      mode={mode}
      risingCount={rising.length}
      growing={growing}
      error={errors[key]}
      hasDived={hasDived}
      // Only on the first question of a fresh fall: never pops up once you're on your way down.
      offerTour={
        offerTour && !touring && depth === 0 && focus.answer === undefined && !hasDived && !diving && rising.length > 0 && !growing
      }
      habitLine={habitLine}
      onRetry={() => controller.grow(focus.id, mode)}
      onMore={() => controller.grow(focus.id, mode)}
      onTour={startTour}
      // Just for this fall: the next new question offers it again, until you take the tour.
      onDeclineTour={() => setOfferTour(false)}
    />
  );

  return (
    <div className="relative flex h-dvh flex-col overflow-clip bg-midnight">
      <FallHeader
        mode={mode}
        onModeChange={controller.setMode}
        soundOn={sound.soundOn}
        onToggleSound={sound.toggleSound}
        onHelp={startTour}
        onLookUp={() => setLookingUp(true)}
        onLeave={climbOut}
      />

      <main className="absolute inset-0">
        <Tunnel
          mode={mode}
          burst={burst}
          paused={lookingUp || rabbitOpen || touring}
          rising={climbing}
          onSpeed={sound.setSpeed}
          depth={depth}
          steer={steering.steer}
          push={push}
        />
        {/* The deeper you go, the more the dark closes in around the edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(4_3_10)_100%)] transition-opacity duration-[2000ms]"
          style={{ opacity: Math.min(depth / 8, 1) * 0.85 }}
        />
        <RabbitSightings
          reduce={reduce}
          depth={depth}
          // The rabbit leaves you be when things feel heavy, and while you're busy elsewhere.
          catchable={!session.care && !lookingUp && !rabbitOpen && !touring && !climbing && !diving}
          onCatch={catchRabbit}
        />

        {mode === "astray" ? (
          <AstrayGhosts
            key={focus.id}
            live={growing ? (controller.candidates[key] ?? []) : []}
            passedOver={!growing && rising.length > 0 ? (focus.passedOver ?? []) : []}
            reduce={reduce}
          />
        ) : null}

        {narrow ? null : (
          <>
            {/* The question you're holding, at the heart of the hole. */}
            <motion.div className="pointer-events-none absolute inset-0 grid place-items-center px-6" style={{ x: heldX, y: heldY }}>
              {held}
            </motion.div>

            {/* Questions rising out of the dark. */}
            <AnimatePresence>
              <motion.div
                key={`${focus.id}:${mode}`}
                className="absolute inset-0"
                style={{ x: risingX, y: risingY }}
                exit={{ opacity: 0, transition: { duration: 0.25 } }}
              >
                {rising.map(risingQuestion)}
              </motion.div>
            </AnimatePresence>

            {controls("pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-4 pb-5")}
          </>
        )}
      </main>

      {narrow ? (
        // Phones: a stack, so nothing can ever sit on top of anything else. Two questions above,
        // the one you're holding, two below, then the controls; each takes the room its words need.
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${focus.id}:${mode}:above`}
              className="grid flex-1 grid-cols-2 items-end gap-x-4 pt-5"
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            >
              {rising.filter((q) => slotOf(q) < 2).map(risingQuestion)}
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none my-5 flex shrink-0 justify-center [@media(max-height:720px)]:my-3">{held}</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${focus.id}:${mode}:below`}
              className="grid flex-1 grid-cols-2 items-start gap-x-4"
              exit={{ opacity: 0, transition: { duration: 0.25 } }}
            >
              {rising.filter((q) => slotOf(q) >= 2).map(risingQuestion)}
            </motion.div>
          </AnimatePresence>
          {controls(
            "pointer-events-none relative z-20 flex shrink-0 flex-col items-center gap-2 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        </div>
      ) : null}

      {/* Arriving: you come out of the portal's darkness already falling. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 bg-[#04030a]"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.2 : 1.1, ease: "easeOut" }}
      />

      <AnimatePresence>{session.care ? <CareNote /> : null}</AnimatePresence>
      <AnimatePresence>{touring ? <Tour onDone={endTour} /> : null}</AnimatePresence>
      <AnimatePresence>{climbing ? <ClimbOut /> : null}</AnimatePresence>
      <AnimatePresence>
        {rabbitOpen ? (
          <RabbitAsks holding={focus.answer ?? focus.text} onAnswer={fallIntoAnswer} onClose={() => setRabbitOpen(false)} />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {lookingUp ? <LookUp session={session} onJump={jump} onClose={() => setLookingUp(false)} /> : null}
      </AnimatePresence>
    </div>
  );
}
