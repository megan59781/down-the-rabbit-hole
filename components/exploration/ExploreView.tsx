"use client";

import { clsx } from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/branding/Logo";
import { RabbitLoader } from "@/components/branding/RabbitGuide";
import { RabbitIcon } from "@/components/branding/RabbitIcon";
import { SimulationRenderer } from "@/components/simulations/SimulationRenderer";
import { TrailMap } from "@/components/trail/TrailMap";
import { MODES } from "@/lib/modes";
import { getNode, thoughtAnchor } from "@/lib/session/tree";
import { useExplorationSession, type ExplorationController } from "@/lib/session/useExplorationSession";
import type { ExplorationNode, ExplorationSession } from "@/lib/types";
import { DirectionSelector } from "./DirectionSelector";
import { ModeToggle } from "./ModeToggle";
import { MutationExplorer } from "./MutationExplorer";
import { QuestionExplorer } from "./QuestionExplorer";

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function ExploreView({ sessionId }: { sessionId: string }) {
  const controller = useExplorationSession(sessionId);
  const [trailOpen, setTrailOpen] = useState(false);
  const { session } = controller;

  if (!session) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <RabbitIcon portal className="h-16 w-16 text-soft/70" />
        <h1 className="font-serif text-3xl text-soft">This trail has gone cold.</h1>
        <p className="max-w-sm text-muted">
          We couldn&rsquo;t find this exploration. It may have been cleared from this browser.
        </p>
        <Link href="/" className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight">
          Start a new thought →
        </Link>
      </div>
    );
  }

  const current = getNode(session, session.currentNodeId)!;
  const anchor = thoughtAnchor(session, current.id);
  const mode = anchor?.mode;

  const selectNode = (id: string) => {
    controller.goTo(id);
    setTrailOpen(false);
    scrollTop();
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-midnight/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Link href="/" aria-label="Back to the start">
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="sm:hidden">
              <Logo compact />
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {mode ? (
              <ModeToggle
                mode={mode}
                onChange={(m) => {
                  controller.switchMode(m);
                  scrollTop();
                }}
              />
            ) : null}
            <button
              type="button"
              onClick={() => setTrailOpen(true)}
              className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:text-soft lg:hidden"
            >
              Trail ({session.nodes.length})
            </button>
            <Link
              href="/"
              className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs text-muted hover:text-soft sm:inline-block"
            >
              New thought
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${current.id}:${current.type === "mutation" ? "" : (current.mode ?? "choose")}`}
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
              transition={{ duration: 0.35 }}
            >
              {current.type === "mutation" ? (
                <MutationStage node={current} session={session} controller={controller} onNavigate={scrollTop} />
              ) : (
                <ThoughtStage node={current} session={session} controller={controller} onNavigate={scrollTop} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1">
            <TrailMap session={session} onSelect={selectNode} />
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {trailOpen ? (
          <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              aria-label="Close trail"
              className="absolute inset-0 bg-midnight/70 backdrop-blur-sm"
              onClick={() => setTrailOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-midnight-2 p-5"
            >
              <TrailMap session={session} onSelect={selectNode} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

type StageProps = {
  node: ExplorationNode;
  session: ExplorationSession;
  controller: ExplorationController;
  onNavigate: () => void;
};

function DemoBadge({ node }: { node: ExplorationNode }) {
  if (node.source !== "demo") return null;
  return (
    <span
      title="Sample content, not generated by AI"
      className="rounded-full border border-white/15 px-2.5 py-0.5 text-[0.65rem] tracking-[0.15em] text-muted uppercase"
    >
      Demo content
    </span>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-pink/30 bg-pink/5 p-8 text-center">
      <p className="font-serif text-2xl text-soft">The rabbit lost the trail.</p>
      <p className="mt-2 text-muted">{message}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-full bg-lavender px-5 py-2 font-display text-sm font-semibold text-midnight">
        Try again
      </button>
    </div>
  );
}

function ThoughtStage({ node, session, controller, onNavigate }: StageProps) {
  const parent = getNode(session, node.parentId);
  const mode = node.mode;
  const mutations = mode ? node.mutations?.[mode] : undefined;
  const visited = node.children.map((id) => getNode(session, id)?.mutation?.id).filter((id): id is string => Boolean(id));

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs tracking-[0.25em] text-muted uppercase">
          {node.type === "thought" ? "Your thought" : "Following a question"}
          {parent ? (
            <>
              {" · from "}
              <button
                type="button"
                className="underline decoration-white/20 underline-offset-4 hover:text-soft"
                onClick={() => {
                  controller.goTo(parent.id);
                  onNavigate();
                }}
              >
                {parent.title ?? "previous step"}
              </button>
            </>
          ) : null}
        </p>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-soft sm:text-5xl">{node.content}</h1>
      </div>

      <div className="mt-12">
        {!mode ? (
          <>
            <p className="mb-6 text-center text-muted">Which way do you want to follow it?</p>
            <DirectionSelector onChoose={(m) => controller.chooseMode(node.id, m)} />
          </>
        ) : controller.pending[node.id] ? (
          <RabbitLoader message={mode === "deeper" ? "Digging beneath it…" : "Bending reality…"} />
        ) : controller.errors[node.id] ? (
          <ErrorPanel message={controller.errors[node.id]} onRetry={() => controller.generateMutations(node.id, mode)} />
        ) : mutations ? (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-center">
              <p className={clsx("font-display text-sm tracking-[0.2em] uppercase", MODES[mode].text)}>
                Three ways to see it
              </p>
              <DemoBadge node={node} />
            </div>
            <MutationExplorer
              mutations={mutations}
              mode={mode}
              visitedIds={visited}
              onOpen={(m) => {
                controller.openMutation(node.id, m);
                onNavigate();
              }}
            />
          </>
        ) : (
          <div className="text-center">
            <button
              type="button"
              onClick={() => controller.generateMutations(node.id, mode)}
              className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight"
            >
              Follow the rabbit →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MutationStage({ node, session, controller, onNavigate }: StageProps) {
  const [unlocked, setUnlocked] = useState(false);
  const parent = getNode(session, node.parentId)!;
  const mode = node.mode ?? "deeper";
  const applied = node.appliedInteractions ?? [];

  const back = () => {
    controller.goTo(parent.id);
    onNavigate();
  };

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-3xl text-center">
        <button type="button" onClick={back} className="text-xs tracking-[0.2em] text-muted uppercase hover:text-soft">
          ← {parent.content}
        </button>
        <p className="mt-4 text-xl leading-snug text-soft/90 sm:text-2xl">{node.content}</p>
        <div className="mt-3 flex justify-center">
          <DemoBadge node={node} />
        </div>
      </div>

      {controller.pending[node.id] ? (
        <RabbitLoader message="Building the scene…" />
      ) : controller.errors[node.id] ? (
        <ErrorPanel message={controller.errors[node.id]} onRetry={() => controller.generateSimulation(node.id)} />
      ) : node.simulation ? (
        <>
          <SimulationRenderer
            simulation={node.simulation}
            appliedIds={applied}
            mode={mode}
            onApply={(i) => controller.applyInteraction(node.id, i)}
          />
          <QuestionExplorer
            questions={node.questions ?? []}
            mode={mode}
            locked={applied.length === 0 && !unlocked}
            loading={Boolean(controller.pending[`${node.id}:questions`])}
            onUnlock={() => setUnlocked(true)}
            onFollow={(text) => {
              controller.followQuestion(node.id, text);
              onNavigate();
            }}
            onMore={() => controller.moreQuestions(node.id)}
            onBack={back}
          />
        </>
      ) : (
        <div className="text-center">
          <button
            type="button"
            onClick={() => controller.generateSimulation(node.id)}
            className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight"
          >
            Build the scene →
          </button>
        </div>
      )}
    </div>
  );
}
