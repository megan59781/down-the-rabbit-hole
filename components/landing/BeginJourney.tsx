"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { createSession } from "@/lib/session/tree";
import { sessionStore } from "@/lib/storage/sessions";
import { ThoughtInput } from "./ThoughtInput";

const noopSubscribe = () => () => {};

/** Landing input: creates a session and drops the user into it. */
export function BeginJourney() {
  const router = useRouter();
  const lastSessionId = useSyncExternalStore(
    noopSubscribe,
    () => sessionStore.latestId(),
    () => null,
  );

  function begin(thought: string) {
    const session = createSession(thought);
    sessionStore.save(session);
    router.push(`/explore/${session.id}`);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <ThoughtInput onSubmit={begin} />
      {lastSessionId ? (
        <Link
          href={`/explore/${lastSessionId}`}
          className="mt-6 text-sm text-muted underline decoration-white/20 underline-offset-4 hover:text-soft"
        >
          Return to your last trail →
        </Link>
      ) : null}
    </div>
  );
}
