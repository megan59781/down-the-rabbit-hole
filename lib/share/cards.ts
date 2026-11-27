"use client";

// Share cards, drawn straight onto a canvas in the browser: the same crisp, on-brand image on
// every device, nothing sent anywhere until the person chooses where to share it.

import { RABBIT_PATH } from "@/components/branding/RabbitIcon";
import { MODES } from "@/lib/modes";
import { displayUrl, siteUrl } from "@/lib/site";
import type { ExplorationMode } from "@/lib/types";

export type CardFormat = "portrait" | "story";
export const CARD_SIZE: Record<CardFormat, { w: number; h: number }> = {
  portrait: { w: 1080, h: 1350 }, // 4:5, feeds and messages
  story: { w: 1080, h: 1920 }, // 9:16, stories
};

/** `passed`: the other questions that rose alongside this one, which you didn't pick. */
export type PathStep = { text: string; mode: ExplorationMode; answer?: string; passed?: string[] };
/** `showPassed` draws the roads not taken branching off the thread at each step. */
export type PathCardData = { steps: PathStep[]; includeAnswers: boolean; showPassed?: boolean };
export type YouCardData = {
  topics: { label: string; share: number }[];
  style: { left: string; right: string; lean: number }[];
  verdict: string;
  question?: string;
};

const C = {
  midnight: "#100e19",
  violet: "#6544a5",
  lavender: "#b79aff",
  ice: "#9ccbff",
  pink: "#e5a2e8",
  soft: "#f2eff8",
  muted: "#a9a3b7",
};
const PAD = 88;

type Fonts = { serif: string; display: string; sans: string };

/** The page's own fonts (loaded by next/font under generated names), ready for the canvas. */
async function loadFonts(): Promise<Fonts> {
  const css = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const fonts = {
    serif: read("--font-dm-serif", "Georgia, serif"),
    display: read("--font-space-grotesk", "system-ui, sans-serif"),
    sans: read("--font-inter", "system-ui, sans-serif"),
  };
  await Promise.all([
    document.fonts.load(`400 48px ${fonts.serif}`),
    document.fonts.load(`italic 400 48px ${fonts.serif}`),
    document.fonts.load(`600 40px ${fonts.display}`),
    document.fonts.load(`500 40px ${fonts.display}`),
    document.fonts.load(`400 30px ${fonts.sans}`),
  ]).catch(() => undefined);
  return fonts;
}

/** Greedy word wrap. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** One line, shortened with an ellipsis if it doesn't fit. */
function fitLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** Letter-spaced text drawn a character at a time (canvas letterSpacing isn't everywhere yet). */
function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  return cx;
}

/** A tiny seeded random, so the stars sit in the same places every time. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function background(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = C.midnight;
  ctx.fillRect(0, 0, w, h);
  // The hole: a violet glow and rings receding towards a dark centre, low on the card.
  const cx = w / 2;
  const cy = h * 0.66;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.9);
  glow.addColorStop(0, "rgba(4,3,10,0.95)");
  glow.addColorStop(0.25, "rgba(101,68,165,0.22)");
  glow.addColorStop(1, "rgba(16,14,25,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 11; i++) {
    const r = 46 * Math.pow(1.36, i);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(183,154,255,${0.05 + 0.18 * (i / 11)})`;
    ctx.lineWidth = 1 + i * 0.25;
    ctx.stroke();
  }
  const rand = seeded(7);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(242,239,248,${0.25 + rand() * 0.6})`;
    const size = rand() < 0.15 ? 3 : 2;
    ctx.fillRect(rand() * w, rand() * h, size, size);
  }
  // A soft darkening at the top and bottom so the words always read.
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, "rgba(16,14,25,0.85)");
  fade.addColorStop(0.22, "rgba(16,14,25,0.35)");
  fade.addColorStop(0.8, "rgba(16,14,25,0.35)");
  fade.addColorStop(1, "rgba(16,14,25,0.9)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
}

function rabbit(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour = C.soft) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(RABBIT_PATH));
  ctx.restore();
}

/** The brand lockup, with the O of HOLE drawn as a glowing portal. */
function header(ctx: CanvasRenderingContext2D, f: Fonts) {
  rabbit(ctx, PAD - 6, 70, 84);
  ctx.beginPath();
  ctx.ellipse(PAD + 38, 151, 30, 6, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.lavender;
  ctx.lineWidth = 2;
  ctx.stroke();
  const x = PAD + 104;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.muted;
  ctx.font = `500 20px ${f.display}`;
  spaced(ctx, "DOWN THE", x, 104, 9);
  ctx.fillStyle = C.soft;
  ctx.font = `600 36px ${f.display}`;
  let cx = spaced(ctx, "RABBIT H", x, 148, 7);
  // The portal O, at capital height on the baseline.
  ctx.beginPath();
  ctx.ellipse(cx + 11, 148 - 13, 11, 13, 0, 0, Math.PI * 2);
  ctx.strokeStyle = C.lavender;
  ctx.lineWidth = 3;
  ctx.shadowColor = C.lavender;
  ctx.shadowBlur = 14;
  ctx.stroke();
  ctx.shadowBlur = 0;
  cx += 22 + 7;
  spaced(ctx, "LE", cx, 148, 7);
}

/** The tagline, and the way in: a glowing pill with the site's address. */
function footer(ctx: CanvasRenderingContext2D, f: Fonts, w: number, h: number) {
  ctx.textAlign = "center";
  ctx.fillStyle = C.soft;
  ctx.font = `italic 400 36px ${f.serif}`;
  ctx.fillText("Ask a question. Follow it down the hole.", w / 2, h - 132);

  const link = displayUrl(siteUrl());
  if (link) {
    ctx.font = `600 30px ${f.display}`;
    const label = `${link}  →`;
    const pillW = ctx.measureText(label).width + 72;
    const pillH = 64;
    const x = (w - pillW) / 2;
    const y = h - 104;
    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, pillH / 2);
    ctx.fillStyle = "rgba(183,154,255,0.16)";
    ctx.fill();
    ctx.strokeStyle = C.lavender;
    ctx.lineWidth = 2;
    ctx.shadowColor = C.lavender;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = C.soft;
    ctx.textBaseline = "middle";
    ctx.fillText(label, w / 2, y + pillH / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }
  ctx.textAlign = "left";
}

// ---------------------------------------------------------------- Your fall

type Block =
  | { kind: "step"; step: PathStep; first: boolean; last: boolean }
  | { kind: "gap"; hidden: number };

type Measured = { block: Block; lines: string[]; sub?: string[]; passed?: string[]; passedH: number; height: number };

const PASSED_LH = 32;

function measurePath(ctx: CanvasRenderingContext2D, f: Fonts, blocks: Block[], scale: number, data: PathCardData, textW: number) {
  const { includeAnswers } = data;
  const out: Measured[] = [];
  for (const block of blocks) {
    if (block.kind === "gap") {
      out.push({ block, lines: [], passedH: 0, height: 70 * scale });
      continue;
    }
    const { step, first } = block;
    // The roads not taken at this step: one faint line each, branching off the thread.
    ctx.font = `italic 400 ${24 * scale}px ${f.sans}`;
    const passed = data.showPassed && !first ? (step.passed ?? []).slice(0, 3).map((q) => fitLine(ctx, q, textW - 30 * scale)) : [];
    const passedH = passed.length ? passed.length * PASSED_LH * scale + 14 * scale : 0;
    if (step.answer !== undefined) {
      ctx.font = `italic 400 ${26 * scale}px ${f.sans}`;
      const sub = wrap(ctx, `The rabbit asked: ${step.text}`, textW);
      ctx.font = `400 ${38 * scale}px ${f.serif}`;
      const said = includeAnswers ? `“${step.answer}”` : "Told the rabbit something only I know.";
      const lines = wrap(ctx, said, textW);
      out.push({ block, lines, sub, passed, passedH, height: passedH + sub.length * 34 * scale + lines.length * 46 * scale + 14 * scale });
      continue;
    }
    ctx.font = first ? `400 ${58 * scale}px ${f.serif}` : `500 ${36 * scale}px ${f.display}`;
    const lines = wrap(ctx, step.text, textW);
    const lh = first ? 66 * scale : 46 * scale;
    out.push({ block, lines, passed, passedH, height: passedH + lines.length * lh });
  }
  return out;
}

function drawPath(ctx: CanvasRenderingContext2D, f: Fonts, data: PathCardData, w: number, h: number) {
  background(ctx, w, h);
  header(ctx, f);

  const steps = data.steps;
  const levels = steps.length - 1;
  ctx.fillStyle = C.muted;
  ctx.font = `500 24px ${f.display}`;
  spaced(ctx, levels === 0 ? "MY FALL · JUST STARTED" : `MY FALL · ${levels} DOWN`, PAD, 250, 6);

  const top = 300;
  const bottom = h - 190;
  const avail = bottom - top;
  const textX = PAD + 70;
  const textW = w - textX - PAD;
  const GAP = 44;

  // Fit: shrink the type a little, then fold the middle of a long fall into "… N more …".
  let chosen: Measured[] = [];
  let scale = 1;
  outer: for (let keep = steps.length; keep >= 3; keep--) {
    const blocks: Block[] =
      keep === steps.length
        ? steps.map((s, i) => ({ kind: "step", step: s, first: i === 0, last: i === steps.length - 1 }))
        : [
            { kind: "step", step: steps[0], first: true, last: false },
            { kind: "gap", hidden: steps.length - keep },
            ...steps.slice(steps.length - (keep - 1)).map((s, i, arr) => ({
              kind: "step" as const,
              step: s,
              first: false,
              last: i === arr.length - 1,
            })),
          ];
    for (const s of [1, 0.9, 0.8, 0.72]) {
      const m = measurePath(ctx, f, blocks, s, data, textW);
      const total = m.reduce((sum, b) => sum + b.height, 0) + GAP * s * (m.length - 1);
      if (total <= avail) {
        chosen = m;
        scale = s;
        break outer;
      }
    }
  }
  if (chosen.length === 0) {
    // Even folded it won't fit (very long questions): smallest type, first and last only.
    scale = 0.72;
    chosen = measurePath(
      ctx,
      f,
      [
        { kind: "step", step: steps[0], first: true, last: false },
        { kind: "gap", hidden: steps.length - 2 },
        { kind: "step", step: steps[steps.length - 1], first: false, last: true },
      ],
      scale,
      data,
      textW,
    );
  }

  const total = chosen.reduce((sum, b) => sum + b.height, 0) + GAP * scale * (chosen.length - 1);
  let y = top + Math.max(0, (avail - total) / 2);
  const dotX = PAD + 22;
  let prevDot: number | null = null;

  for (const m of chosen) {
    if (m.block.kind === "gap") {
      ctx.fillStyle = C.muted;
      ctx.font = `500 ${24 * scale}px ${f.display}`;
      ctx.fillText(`· · ·  ${m.block.hidden} more question${m.block.hidden === 1 ? "" : "s"}  · · ·`, textX, y + 42 * scale);
      y += m.height + GAP * scale;
      continue;
    }
    const { step, first, last } = m.block;
    const colour = first ? C.lavender : MODES[step.mode].hex;
    // The roads not taken, drawn just above the one you took, each a dashed branch off the thread.
    (m.passed ?? []).forEach((q, k) => {
      const ly = y + (k + 1) * PASSED_LH * scale;
      ctx.save();
      ctx.setLineDash([5 * scale, 6 * scale]);
      ctx.strokeStyle = "rgba(183,154,255,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dotX, ly - 9 * scale);
      ctx.lineTo(textX - 14 * scale, ly - 9 * scale);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "rgba(169,163,183,0.62)";
      ctx.font = `italic 400 ${24 * scale}px ${f.sans}`;
      ctx.fillText(q, textX, ly - 2 * scale);
    });
    const sy = y + m.passedH;
    const firstLine = step.answer !== undefined ? 34 * scale : first ? 66 * scale : 46 * scale;
    const dotY = sy + firstLine * 0.62;

    // The thread of the fall, glowing from step to step.
    if (prevDot !== null) {
      const line = ctx.createLinearGradient(0, prevDot, 0, dotY);
      line.addColorStop(0, "rgba(183,154,255,0.25)");
      line.addColorStop(1, "rgba(183,154,255,0.85)");
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.shadowColor = C.lavender;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(dotX, prevDot + 14);
      ctx.lineTo(dotX, dotY - 14);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    if (step.answer !== undefined) {
      rabbit(ctx, dotX - 17, dotY - 18, 34, C.lavender);
    } else {
      ctx.beginPath();
      ctx.arc(dotX, dotY, first ? 12 : last ? 11 : 8, 0, Math.PI * 2);
      ctx.fillStyle = colour;
      ctx.shadowColor = colour;
      ctx.shadowBlur = last ? 24 : 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    prevDot = dotY;

    let ty = sy;
    if (step.answer !== undefined) {
      ctx.fillStyle = C.muted;
      ctx.font = `italic 400 ${26 * scale}px ${f.sans}`;
      for (const l of m.sub ?? []) {
        ty += 34 * scale;
        ctx.fillText(l, textX, ty - 8 * scale);
      }
      ctx.fillStyle = data.includeAnswers ? C.soft : C.lavender;
      ctx.font = data.includeAnswers ? `400 ${38 * scale}px ${f.serif}` : `italic 400 ${38 * scale}px ${f.serif}`;
      ty += 6 * scale;
      for (const l of m.lines) {
        ty += 46 * scale;
        ctx.fillText(l, textX, ty - 10 * scale);
      }
    } else {
      ctx.fillStyle = first || last ? C.soft : "rgba(242,239,248,0.78)";
      ctx.font = first ? `400 ${58 * scale}px ${f.serif}` : `500 ${36 * scale}px ${f.display}`;
      const lh = first ? 66 * scale : 46 * scale;
      for (const l of m.lines) {
        ty += lh;
        ctx.fillText(l, textX, ty - lh * 0.22);
      }
    }
    if (last && levels > 0) {
      ctx.fillStyle = colour;
      ctx.font = `500 ${22 * scale}px ${f.display}`;
      spaced(ctx, "STILL FALLING", textX, ty + 30 * scale, 5);
    }
    y += m.height + GAP * scale;
  }

  footer(ctx, f, w, h);
}

// ---------------------------------------------------------------- About you

function drawYou(ctx: CanvasRenderingContext2D, f: Fonts, data: YouCardData, w: number, h: number) {
  background(ctx, w, h);
  header(ctx, f);
  const innerW = w - PAD * 2;

  // Measure every section first, then centre the whole block between header and footer.
  ctx.font = `400 64px ${f.serif}`;
  const title = wrap(ctx, "What the rabbit has learnt about me", innerW);
  ctx.font = `400 44px ${f.serif}`;
  const question = data.question ? wrap(ctx, `“${data.question}”`, innerW - 40) : [];
  ctx.font = `400 30px ${f.sans}`;
  const verdict = wrap(ctx, data.verdict, innerW - 64);

  const topicsH = data.topics.length ? 50 + data.topics.length * 58 : 0;
  const styleH = data.style.length ? 70 + data.style.length * 54 : 0;
  const questionH = question.length ? 60 + question.length * 54 : 0;
  const sections = [title.length * 72, topicsH, styleH, verdict.length * 40 + 48, questionH].filter((x) => x > 0);
  const gap = 52;
  const total = sections.reduce((a, b) => a + b, 0) + gap * (sections.length - 1);
  const top = 250;
  const bottom = h - 190;
  let y = top + Math.max(0, (bottom - top - total) / 2);

  ctx.fillStyle = C.soft;
  ctx.font = `400 64px ${f.serif}`;
  for (const l of title) {
    y += 72;
    ctx.fillText(l, PAD, y - 14);
  }
  y += gap;

  if (data.topics.length) {
    ctx.fillStyle = C.lavender;
    ctx.font = `500 22px ${f.display}`;
    spaced(ctx, "I KEEP FALLING TOWARDS", PAD, y + 22, 6);
    y += 50;
    for (const t of data.topics) {
      ctx.fillStyle = C.soft;
      ctx.font = `500 32px ${f.display}`;
      ctx.fillText(t.label, PAD, y + 34);
      const barX = PAD + 250;
      const barW = innerW - 250 - 100;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(barX, y + 18, barW, 14, 7);
      ctx.fill();
      ctx.fillStyle = C.lavender;
      ctx.shadowColor = C.lavender;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(barX, y + 18, Math.max(14, barW * t.share), 14, 7);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = C.muted;
      ctx.font = `400 26px ${f.sans}`;
      ctx.textAlign = "right";
      ctx.fillText(`${Math.round(t.share * 100)}%`, w - PAD, y + 34);
      ctx.textAlign = "left";
      y += 58;
    }
    y += gap;
  }

  if (data.style.length) {
    ctx.fillStyle = C.lavender;
    ctx.font = `500 22px ${f.display}`;
    spaced(ctx, "THE KIND OF QUESTIONS I PICK", PAD, y + 22, 6);
    y += 70;
    for (const s of data.style) {
      const trackX = PAD + 180;
      const trackW = innerW - 360;
      ctx.font = `500 28px ${f.display}`;
      ctx.textAlign = "right";
      ctx.fillStyle = s.lean < -0.25 ? C.soft : C.muted;
      ctx.fillText(s.left, trackX - 24, y + 10);
      ctx.textAlign = "left";
      ctx.fillStyle = s.lean > 0.25 ? C.soft : C.muted;
      ctx.fillText(s.right, trackX + trackW + 24, y + 10);
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.roundRect(trackX, y - 4, trackW, 10, 5);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(trackX + trackW / 2 - 1, y - 12, 2, 26);
      ctx.beginPath();
      ctx.arc(trackX + trackW * (0.5 + s.lean / 2), y + 1, 13, 0, Math.PI * 2);
      ctx.fillStyle = C.lavender;
      ctx.shadowColor = C.lavender;
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
      y += 54;
    }
    y += gap - 20;
  }

  // The verdict, in a soft panel.
  const panelH = verdict.length * 40 + 48;
  ctx.fillStyle = "rgba(183,154,255,0.10)";
  ctx.strokeStyle = "rgba(183,154,255,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(PAD, y, innerW, panelH, 28);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.soft;
  ctx.font = `400 30px ${f.sans}`;
  let vy = y + 24;
  for (const l of verdict) {
    vy += 40;
    ctx.fillText(l, PAD + 32, vy - 10);
  }
  y += panelH + gap;

  if (question.length) {
    ctx.fillStyle = C.lavender;
    ctx.font = `500 22px ${f.display}`;
    spaced(ctx, "A QUESTION I FELL INTO", PAD, y + 22, 6);
    y += 60;
    ctx.fillStyle = C.soft;
    ctx.font = `400 44px ${f.serif}`;
    for (const l of question) {
      y += 54;
      ctx.fillText(l, PAD, y - 12);
    }
  }

  footer(ctx, f, w, h);
}

// ---------------------------------------------------------------- Render

export type CardRequest =
  | { kind: "path"; data: PathCardData; format: CardFormat }
  | { kind: "you"; data: YouCardData; format: CardFormat };

/** Draw a card and hand it back as a PNG. */
export async function renderCard(request: CardRequest): Promise<Blob> {
  const fonts = await loadFonts();
  const { w, h } = CARD_SIZE[request.format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't draw the card.");
  if (request.kind === "path") drawPath(ctx, fonts, request.data, w, h);
  else drawYou(ctx, fonts, request.data, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't make the image."))), "image/png"),
  );
}
