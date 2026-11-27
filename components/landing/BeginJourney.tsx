"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createSession } from "@/lib/session/tree";
import { sessionStore } from "@/lib/storage/sessions";
import { JUMP_MS, JumpIn } from "./JumpIn";
import { ThoughtInput } from "./ThoughtInput";

const noopSubscribe = () => () => {};

/** Landing input: creates a session, plays the jump into the hole, and drops the user in. */
export function BeginJourney() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [jumping, setJumping] = useState<string | null>(null);
  const [visit, setVisit] = useState(0);
  // Next keeps this page alive in the background after you leave (cacheComponents), state and
  // all. Its effects re-run each time it's shown again: start fresh then, with an empty box and
  // no half-finished jump replaying over the page. Only on a return, though: resetting on the
  // first visit would wipe anything typed straight after the page loads.
  const shownBefore = useRef(false);
  useEffect(() => {
    if (!shownBefore.current) {
      shownBefore.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setJumping(null);
      setVisit((v) => v + 1);
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  const lastSessionId = useSyncExternalStore(
    noopSubscribe,
    () => sessionStore.latestId(),
    () => null,
  );

  function begin(thought: string) {
    if (jumping) return;
    const session = createSession(thought);
    sessionStore.save(session);
    const href = `/explore/${session.id}`;
    if (reduce) return router.push(href);
    router.prefetch(href);
    setJumping(thought);
    setTimeout(() => router.push(href), JUMP_MS);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <ThoughtInput key={visit} onSubmit={begin} />
      {lastSessionId ? (
        <Link
          href={`/explore/${lastSessionId}`}
          className="mt-6 text-sm text-muted underline decoration-white/20 underline-offset-4 hover:text-soft"
        >
          Return to your last fall →
        </Link>
      ) : null}
      {jumping ? <JumpIn question={jumping} /> : null}
    </div>
  );
}
