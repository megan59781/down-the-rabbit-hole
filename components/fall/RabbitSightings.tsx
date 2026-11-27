"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { VANISH } from "./stage";

const CAUGHT_KEY = "rabbit-hole:caught";

/**
 * Every so often the rabbit flashes past, just ahead of you. Catch it (tap it, or press R while
 * it's there) and it stops to ask you something. Reduced motion: it sits still for a moment instead.
 */
export function RabbitSightings({
  reduce,
  depth,
  catchable,
  onCatch,
}: {
  reduce: boolean;
  depth: number;
  catchable: boolean;
  onCatch: () => void;
}) {
  const [sighting, setSighting] = useState<{ key: number; angle: number } | null>(null);
  const [hint, setHint] = useState(false);
  const depthRef = useRef(depth);
  useEffect(() => {
    depthRef.current = depth;
  }, [depth]);

  // Until you've caught it once, it whispers "catch me".
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setHint(window.localStorage.getItem(CAUGHT_KEY) !== "1");
      } catch {
        setHint(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay: number) => {
      timer = setTimeout(() => {
        setSighting({ key: Date.now(), angle: Math.random() * Math.PI * 2 });
        // The deeper you are, the more often the rabbit shows itself.
        const gap = Math.max(5000, 16000 - depthRef.current * 1800);
        schedule(gap + Math.random() * gap * 0.6);
      }, delay);
    };
    schedule(6000);
    return () => clearTimeout(timer);
  }, []);

  const duration = reduce ? 5 : catchable ? 2.8 : 1.5;
  useEffect(() => {
    if (!sighting) return;
    const timer = setTimeout(() => setSighting(null), duration * 1000);
    return () => clearTimeout(timer);
  }, [sighting, duration]);

  const caught = useCallback(() => {
    setSighting(null);
    setHint(false);
    try {
      window.localStorage.setItem(CAUGHT_KEY, "1");
    } catch {
      // Fine: the hint just shows again next visit.
    }
    onCatch();
  }, [onCatch]);

  // Keyboard: press R while the rabbit is visible.
  useEffect(() => {
    if (!sighting || !catchable) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea");
      if (!typing && (e.key === "r" || e.key === "R")) caught();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sighting, catchable, caught]);

  if (!sighting || (reduce && !catchable)) return null;
  const end = { x: VANISH.x + Math.cos(sighting.angle) * 70, y: VANISH.y + Math.sin(sighting.angle) * 70 };
  const rest = { x: VANISH.x + Math.cos(sighting.angle) * 30, y: VANISH.y + Math.sin(sighting.angle) * 26 };
  const rabbit = <RabbitIcon className="h-10 w-10" />;

  if (!catchable) {
    return (
      <motion.div
        key={sighting.key}
        aria-hidden
        className="pointer-events-none absolute z-0 -translate-x-1/2 -translate-y-1/2 text-soft"
        initial={{ left: `${VANISH.x}%`, top: `${VANISH.y}%`, scale: 0.2, opacity: 0, rotate: 0 }}
        animate={{
          left: `${end.x}%`,
          top: `${end.y}%`,
          scale: 2.4,
          opacity: [0, 0.8, 0],
          rotate: sighting.angle > Math.PI ? -25 : 25,
        }}
        transition={{ duration: 1.5, ease: "easeIn" }}
      >
        {rabbit}
      </motion.div>
    );
  }

  return (
    <motion.button
      key={sighting.key}
      type="button"
      onClick={caught}
      aria-label="Catch the rabbit (or press R)"
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full p-4 text-soft focus-visible:outline-2 focus-visible:outline-lavender"
      initial={
        reduce
          ? { left: `${rest.x}%`, top: `${rest.y}%`, opacity: 0 }
          : { left: `${VANISH.x}%`, top: `${VANISH.y}%`, scale: 0.2, opacity: 0, rotate: 0 }
      }
      animate={
        reduce
          ? { opacity: [0, 1, 1, 0] }
          : {
              // Slower than a glimpse, so it can be caught: out of the dark, a pause to look at you, gone.
              left: [`${VANISH.x}%`, `${rest.x}%`, `${rest.x}%`, `${end.x}%`],
              top: [`${VANISH.y}%`, `${rest.y}%`, `${rest.y}%`, `${end.y}%`],
              scale: [0.2, 1.4, 1.5, 2.6],
              opacity: [0, 1, 1, 0],
              rotate: [0, 0, sighting.angle > Math.PI ? -8 : 8, sighting.angle > Math.PI ? -25 : 25],
            }
      }
      transition={{ duration, times: [0, 0.3, 0.7, 1], ease: "easeInOut" }}
    >
      <span className="block drop-shadow-[0_0_12px_rgb(183_154_255/0.9)]">{rabbit}</span>
      {hint ? (
        <span className="absolute top-full left-1/2 -translate-x-1/2 font-display text-[0.6rem] tracking-[0.2em] whitespace-nowrap text-lavender uppercase">
          catch me
        </span>
      ) : null}
    </motion.button>
  );
}
