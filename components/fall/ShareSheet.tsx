"use client";

import { clsx } from "clsx";
import { motion } from "framer-motion";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getHabits, leanings, narrowness, styleLean } from "@/lib/astray/habits";
import { STYLE_AXES, type StyleAxis } from "@/lib/astray/territories";
import { childrenOf, pathTo } from "@/lib/session/tree";
import { renderCard, type CardFormat, type CardRequest } from "@/lib/share/cards";
import { siteUrl } from "@/lib/site";
import type { ExplorationSession } from "@/lib/types";

export type ShareKind = "path" | "you";

const KINDS: { id: ShareKind; label: string }[] = [
  { id: "path", label: "Your fall" },
  { id: "you", label: "About you" },
];
const FORMATS: { id: CardFormat; label: string }[] = [
  { id: "portrait", label: "Post" },
  { id: "story", label: "Story" },
];

/** First person, for a card someone shares about themselves. */
function verdictFor(narrow: number) {
  if (narrow > 0.5) return "I'm quite set in my ways. The rabbit is going to lead me astray.";
  if (narrow > 0.25) return "I have my favourites, but I wander.";
  return "I roam all over. The rabbit has to work hard to surprise me.";
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Share a card of your fall or of what the rabbit has learnt about you. The image is drawn
 * here in the browser; nothing leaves the device until you pick where to send it.
 */
export function ShareSheet({
  session,
  initial,
  onClose,
}: {
  session: ExplorationSession;
  initial: ShareKind;
  onClose: () => void;
}) {
  const titleId = useId();
  const [kind, setKind] = useState<ShareKind>(initial);
  // Story first: it's the size most people share from a phone.
  const [format, setFormat] = useState<CardFormat>("story");
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [showPassed, setShowPassed] = useState(false);
  const [image, setImage] = useState<{ url: string; blob: Blob } | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  // The caption stays hidden until you share: Share sends it with the image itself, and after
  // Download or Copy image it appears, ready to paste alongside.
  const [captionReady, setCaptionReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  const path = useMemo(() => pathTo(session, session.focusId), [session]);
  const hasAnswers = path.some((n) => n.answer !== undefined);
  // Each step with the questions that rose alongside it (same direction) that you didn't pick.
  const steps = useMemo(
    () =>
      path.map((n) => ({
        text: n.text,
        mode: n.mode,
        answer: n.answer,
        passed:
          n.parentId && n.answer === undefined
            ? childrenOf(session, n.parentId)
                .filter((s) => s.id !== n.id && s.answer === undefined && s.mode === n.mode)
                .slice(-4)
                .map((s) => s.text)
            : [],
      })),
    [path, session],
  );
  const hasPassed = steps.some((s) => s.passed.length > 0);

  // What the rabbit has learnt, as of opening the sheet.
  const you = useMemo(() => {
    const habits = getHabits();
    const topics = leanings(habits)
      .slice(0, 5)
      .map((l) => ({ label: capitalise(l.territory), share: l.share }));
    const style = (Object.entries(styleLean(habits)) as [StyleAxis, number][]).map(([axis, lean]) => ({
      left: STYLE_AXES[axis][0],
      right: STYLE_AXES[axis][1],
      lean,
    }));
    // The deepest real question in this fall (not one of your private answers).
    const question = path.filter((n) => n.answer === undefined).at(-1)?.text;
    return { ready: habits.choices >= 2 && topics.length > 0, data: { topics, style, verdict: verdictFor(narrowness(habits)), question } };
  }, [path]);

  const request: CardRequest | null =
    kind === "path"
      ? {
          kind: "path",
          format,
          data: { steps, includeAnswers, showPassed },
        }
      : you.ready
        ? { kind: "you", format, data: you.data }
        : null;
  const requestKey = JSON.stringify(request);

  // Redraw the card whenever the choices change, and tidy up the old image.
  useEffect(() => {
    if (!request) return;
    let live = true;
    let url: string | null = null;
    renderCard(request)
      .then((blob) => {
        if (!live) return;
        url = URL.createObjectURL(blob);
        setImage({ url, blob });
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
    // requestKey stands for request: redraw only when what's on the card actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fileName = `rabbit-hole-${kind === "path" ? "my-fall" : "about-me"}${format === "story" ? "-story" : ""}.png`;
  const file = image ? new File([image.blob], fileName, { type: "image/png" }) : null;
  const canShare = Boolean(
    file && typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] }),
  );
  const canCopy =
    typeof window !== "undefined" && "ClipboardItem" in window && Boolean(navigator.clipboard?.write);

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(null), 2200);
  };

  // The words that go with the card. The link sits in the text itself, because many apps drop a
  // separate link when an image is attached.
  const link = siteUrl();
  const levels = path.length - 1;
  const root = path[0]?.text ?? "";
  const caption =
    kind === "path"
      ? (levels > 0
          ? `I fell ${levels} question${levels === 1 ? "" : "s"} down the rabbit hole, starting from “${root}”`
          : `I've just started falling down the rabbit hole from “${root}”`) +
        (link ? ` – Where will you fall in: ${link}` : " – Where will you fall in?")
      : `The rabbit has profiled my habits, what would it learn about you?${link ? ` Fall in: ${link}` : ""}`;

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      flash("Caption copied.");
    } catch {
      flash("Couldn't copy the caption.");
    }
  }

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "Down the Rabbit Hole", text: caption });
    } catch (error) {
      // Closing the share menu isn't an error.
      if (!(error instanceof DOMException && error.name === "AbortError")) flash("Couldn't share. Try Download instead.");
    }
  }

  async function copy() {
    if (!image) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": image.blob })]);
      flash("Copied. Paste it anywhere.");
      setCaptionReady(true);
    } catch {
      flash("Couldn't copy. Try Download instead.");
    }
  }

  function download() {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
    flash("Saved.");
    setCaptionReady(true);
  }

  const ready = Boolean(request && image && !failed);

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-midnight/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-3xl flex-col gap-5 rounded-3xl border border-white/15 bg-midnight-2/95 p-5 shadow-[0_0_60px_-15px_rgb(183_154_255/0.6)] focus:outline-none sm:flex-row sm:p-6"
        initial={{ scale: 0.94, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* The card itself, exactly as it will be shared. */}
        <div className="flex shrink-0 items-center justify-center sm:w-[46%]">
          {request ? (
            image && !failed ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob, not an optimisable asset
              <img
                src={image.url}
                alt={kind === "path" ? "Your share card: your fall" : "Your share card: what the rabbit has learnt about you"}
                className="max-h-[52dvh] w-auto rounded-2xl border border-white/10 shadow-[0_0_40px_-10px_rgb(183_154_255/0.5)] sm:max-h-[70dvh]"
              />
            ) : (
              <p className="py-16 text-sm text-muted italic">{failed ? "Couldn't draw the card." : "Drawing your card…"}</p>
            )
          ) : (
            <p className="max-w-xs py-16 text-center text-sm text-muted">
              The rabbit hasn&rsquo;t learnt enough about you yet. Grab a few more questions, then come back.
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="font-serif text-2xl text-soft">
                Share
              </h2>
              <p className="text-sm text-muted">Made on your device. Nothing&rsquo;s sent until you choose where.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-muted hover:text-soft"
            >
              ×
            </button>
          </div>

          <Segmented label="Card" options={KINDS} value={kind} onChange={setKind} />
          <Segmented label="Size" options={FORMATS} value={format} onChange={setFormat} />

          {kind === "path" && hasPassed ? (
            <Switch checked={showPassed} onChange={setShowPassed} label="Show the questions I didn't pick" />
          ) : null}

          {kind === "path" && hasAnswers ? (
            <Switch checked={includeAnswers} onChange={setIncludeAnswers} label="Include my answers to the rabbit" />
          ) : null}

          <div className="mt-auto flex flex-wrap gap-2">
            {canShare ? (
              <button
                type="button"
                onClick={share}
                disabled={!ready}
                className="rounded-full bg-lavender px-5 py-2.5 font-display text-sm font-semibold text-midnight transition hover:bg-soft disabled:opacity-40"
              >
                Share…
              </button>
            ) : null}
            <button
              type="button"
              onClick={download}
              disabled={!ready}
              className={clsx(
                "rounded-full px-5 py-2.5 font-display text-sm font-semibold transition disabled:opacity-40",
                canShare
                  ? "border border-white/20 text-soft hover:border-white/40"
                  : "bg-lavender text-midnight hover:bg-soft",
              )}
            >
              Download
            </button>
            {canCopy ? (
              <button
                type="button"
                onClick={copy}
                disabled={!ready}
                className="rounded-full border border-white/20 px-5 py-2.5 font-display text-sm font-semibold text-soft transition hover:border-white/40 disabled:opacity-40"
              >
                Copy image
              </button>
            ) : null}
          </div>
          {/* After Download or Copy image (images can't carry text), the caption to paste alongside. */}
          {captionReady ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-midnight/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs tracking-[0.2em] text-muted uppercase">Add this caption</span>
                <button type="button" onClick={copyCaption} className="text-xs text-lavender hover:text-soft">
                  Copy caption
                </button>
              </div>
              <p className="mt-1.5 text-sm text-soft/90">{caption}</p>
            </motion.div>
          ) : null}
          <p role="status" className="min-h-5 text-sm text-lavender">
            {status}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex items-center gap-3">
      <span className="w-10 text-xs tracking-[0.2em] text-muted uppercase">{label}</span>
      <div className="flex rounded-full border border-white/15 bg-midnight/60 p-1">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === value}
            onClick={() => onChange(o.id)}
            className={clsx(
              "rounded-full px-4 py-1.5 font-display text-sm font-semibold transition",
              o.id === value ? "bg-lavender text-midnight" : "text-muted hover:text-soft",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** An on/off switch beside its label; the whole row is the control, and it reads as a switch to screen readers. */
function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 self-start text-left text-sm text-soft"
    >
      <span
        aria-hidden
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-lavender bg-lavender/80" : "border-white/20 bg-midnight/70 group-hover:border-white/40",
        )}
      >
        <motion.span
          className={clsx(
            "absolute top-1/2 left-0.5 h-4.5 w-4.5 -translate-y-1/2 rounded-full",
            checked ? "bg-midnight" : "bg-muted",
          )}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
        />
      </span>
      {label}
    </button>
  );
}
