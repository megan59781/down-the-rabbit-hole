import {
  appeal,
  FADE_PER_CHOICE,
  forgetHabits,
  getHabits,
  habitTerritories,
  type Habits,
  leanings,
  narrowness,
  recordChoice,
  styleHabits,
  styleLean,
  tasteProfile,
} from "@/lib/astray/habits";

// habits.ts keeps its model in localStorage; give it a small in-memory one.
const store = new Map<string, string>();
(globalThis as unknown as { window: unknown }).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  },
};

const habits = (over: Partial<Habits> = {}): Habits => ({
  grabs: [],
  skips: [],
  weights: {},
  styleWeights: {},
  choices: 6,
  ...over,
});

beforeEach(() => forgetHabits());

describe("the habit model", () => {
  it("learns from a choice: the chosen topic and style up, the passed-over ones down, old ones fading", () => {
    recordChoice({ text: "A?", territory: "science", style: { tone: "playful" } }, [
      { text: "B?", territory: "art", style: { tone: "serious" } },
    ]);
    recordChoice({ text: "C?", territory: "science", style: { tone: "playful" } }, [
      { text: "D?", territory: "history", style: { tone: "serious" } },
    ]);
    const h = getHabits();
    expect(h.choices).toBe(2);
    expect(h.weights.science).toBeCloseTo(1 * FADE_PER_CHOICE + 1);
    expect(h.weights.art).toBeUndefined(); // passed over, never chosen: no weight to take from
    expect(h.styleWeights.playful).toBeCloseTo(1 * FADE_PER_CHOICE + 1);
    expect(h.grabs.map((g) => g.text)).toEqual(["A?", "C?"]);
    expect(h.skips.map((s) => s.text)).toEqual(["B?", "D?"]);
  });

  it("forgets everything when asked", () => {
    recordChoice({ text: "A?", territory: "science" }, []);
    forgetHabits();
    expect(getHabits().choices).toBe(0);
  });

  it("reports leanings as shares, strongest first", () => {
    const l = leanings(habits({ weights: { science: 3, art: 1 } }));
    expect(l.map((x) => x.territory)).toEqual(["science", "art"]);
    expect(l[0].share).toBeCloseTo(0.75);
  });

  it("measures how set in your ways you are", () => {
    const narrow = narrowness(habits({ weights: { science: 10 }, styleWeights: { playful: 5 } }));
    const broad = narrowness(
      habits({ weights: { science: 1, art: 1, history: 1, myth: 1, space: 1, money: 1, people: 1, nature: 1 } }),
    );
    expect(narrow).toBeGreaterThan(0.8);
    expect(broad).toBeLessThan(0.3);
    expect(narrowness(habits({ weights: { science: 10 }, choices: 2 }))).toBe(0); // too early to say
  });

  it("reads a lean on each style axis, and names the clear ones", () => {
    const h = habits({ styleWeights: { playful: 4, serious: 1, vast: 2 } });
    expect(styleLean(h).tone).toBeCloseTo((1 - 4) / 5);
    expect(styleLean(h).scale).toBe(1);
    expect(styleHabits(h)).toEqual(["vast", "playful"]);
  });

  it("only steers away from clear favourites", () => {
    expect(habitTerritories(habits({ weights: { science: 5, art: 0.5 } }))).toEqual(["science"]);
    expect(habitTerritories(habits({ weights: { science: 5 }, choices: 2 }))).toEqual([]);
  });

  it("scores how likely you are to grab a question", () => {
    const h = habits({ weights: { science: 4, art: 1 }, styleWeights: { playful: 4 } });
    expect(appeal(h, { territory: "science", style: { tone: "playful" } })).toBeCloseTo(1);
    expect(appeal(h, { territory: "myth", style: { tone: "serious" } })).toBe(0);
  });

  it("builds the taste profile the AI is told, only once there's something to tell", () => {
    expect(tasteProfile(habits({ choices: 1 }))).toBeUndefined();
    const at = 0;
    const profile = tasteProfile(
      habits({
        grabs: Array.from({ length: 7 }, (_, i) => ({ text: `Pick ${i}?`, at })),
        skips: [{ text: "Skip?", at }],
        styleWeights: { playful: 3 },
      }),
    );
    expect(profile?.picks).toHaveLength(5);
    expect(profile?.picks.at(-1)).toBe("Pick 6?");
    expect(profile?.skips).toEqual(["Skip?"]);
    expect(profile?.leans).toEqual(["playful"]);
  });
});
