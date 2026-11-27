import type { Habits } from "@/lib/astray/habits";
import { selectAstray } from "@/lib/astray/select";
import type { GeneratedQuestion } from "@/lib/types";

// The on-device embedding model, replaced by fixed vectors (or none at all).
const vectors = new Map<string, number[]>();
jest.mock("@/lib/astray/embedder", () => ({
  embed: jest.fn(async (texts: string[]) => (vectors.size ? texts.map((t) => vectors.get(t)!) : null)),
}));

const unit = (v: number[]) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};

const habits = (over: Partial<Habits> = {}): Habits => ({
  grabs: [],
  skips: [],
  weights: {},
  styleWeights: {},
  choices: 6,
  ...over,
});

const q = (text: string, extra: Partial<GeneratedQuestion> = {}): GeneratedQuestion => ({ text, whisper: "w", ...extra });

afterEach(() => vectors.clear());

describe("selectAstray (the anti-recommender)", () => {
  it("without the model, turns down questions from your favourite territory first", async () => {
    const candidates = [
      q("Science 1?", { territory: "science" }),
      q("Art?", { territory: "art" }),
      q("Science 2?", { territory: "science" }),
      q("History?", { territory: "history" }),
      q("Science 3?", { territory: "science" }),
      q("Myth?", { territory: "myth" }),
    ];
    const result = await selectAstray({
      candidates,
      held: "Held?",
      path: [],
      habits: habits({ weights: { science: 5, art: 0.2 } }),
      timeoutMs: 10,
    });
    expect(result.byMeaning).toBe(false);
    expect(result.chosen).toHaveLength(4);
    expect(result.chosen.slice(0, 3).map((c) => c.territory).sort()).toEqual(["art", "history", "myth"]);
    expect(result.passedOver.every((c) => c.territory === "science")).toBe(true);
  });

  it("against your style: turns down playful questions for someone who always picks playful", async () => {
    const candidates = [
      q("Playful 1?", { territory: "art", style: { tone: "playful" } }),
      q("Serious 1?", { territory: "myth", style: { tone: "serious" } }),
      q("Playful 2?", { territory: "history", style: { tone: "playful" } }),
      q("Serious 2?", { territory: "space", style: { tone: "serious" } }),
      q("Playful 3?", { territory: "money", style: { tone: "playful" } }),
    ];
    const result = await selectAstray({
      candidates,
      held: "Held?",
      path: [],
      habits: habits({ styleWeights: { playful: 6, serious: 0.5 } }),
      timeoutMs: 10,
    });
    expect(result.chosen.slice(0, 2).map((c) => c.text).sort()).toEqual(["Serious 1?", "Serious 2?"]);
  });

  it("with the model, pulls towards what you skip and away from what you pick", async () => {
    vectors.set("Held?", unit([1, 0, 0]));
    for (const g of ["Pick 1", "Pick 2", "Pick 3"]) vectors.set(g, [0, 1, 0]);
    for (const s of ["Skip 1", "Skip 2"]) vectors.set(s, [0, 0, 1]);
    vectors.set("Like my picks A?", unit([0.3, 0.95, 0]));
    vectors.set("Like my picks B?", unit([0.3, 0.9, 0.1]));
    vectors.set("Like my skips A?", unit([0.3, 0, 0.95]));
    vectors.set("Like my skips B?", unit([0.3, 0.1, 0.9]));
    vectors.set("In between?", unit([0.3, 0.6, 0.6]));
    const at = Date.now();
    const result = await selectAstray({
      candidates: ["Like my picks A?", "Like my skips A?", "In between?", "Like my picks B?", "Like my skips B?"].map((t) => q(t)),
      held: "Held?",
      path: [],
      habits: habits({
        grabs: ["Pick 1", "Pick 2", "Pick 3"].map((text) => ({ text, at })),
        skips: ["Skip 1", "Skip 2"].map((text) => ({ text, at })),
      }),
      timeoutMs: 10,
    });
    expect(result.byMeaning).toBe(true);
    const chosen = result.chosen.map((c) => c.text);
    expect(chosen.slice(0, 2).sort()).toEqual(["Like my skips A?", "Like my skips B?"]);
    expect(result.passedOver.some((c) => c.text.startsWith("Like my picks"))).toBe(true);
  });

  it("keeps everything when there are no more candidates than it needs", async () => {
    const result = await selectAstray({ candidates: [q("Only?"), q("Two?")], held: "H?", path: [], habits: habits(), timeoutMs: 10 });
    expect(result.chosen).toHaveLength(2);
    expect(result.passedOver).toHaveLength(0);
  });
});
