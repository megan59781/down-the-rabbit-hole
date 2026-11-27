import { streamQuestions, type QuestionEvent } from "@/lib/ai/questions";
import { collect, fakeProvider } from "./support/fakeProvider";

const base: { path: string[]; exclude: string[]; habits: string[] } = { path: [], exclude: [], habits: [] };

function reply(questions: { q: string; w?: string; t?: string; s?: string }[], care = "no") {
  const lines = [`CARE: ${care}`];
  for (const { q, w, t, s } of questions) {
    lines.push(`Q: ${q}`);
    if (w !== undefined) lines.push(`W: ${w}`);
    if (t !== undefined) lines.push(`T: ${t}`);
    if (s !== undefined) lines.push(`S: ${s}`);
  }
  return lines.join("\n");
}

const questionsOf = (events: QuestionEvent[]) => events.flatMap((e) => (e.type === "question" ? [e.question] : []));

describe("streamQuestions", () => {
  it("parses questions, whispers, territories and styles from a chunked stream", async () => {
    const { provider } = fakeProvider(
      reply([
        { q: "Why do cats push things off tables?", w: "Gravity is a toy.", t: "nature", s: "playful, small, concrete, worldly" },
        { q: "Who first noticed?", w: "Someone wrote it down.", t: "history", s: "serious, vast, abstract, personal" },
      ]),
    );
    const events = await collect(streamQuestions(provider, { ...base, question: "Cats?", mode: "deeper" }));
    expect(questionsOf(events)).toEqual([
      {
        text: "Why do cats push things off tables?",
        whisper: "Gravity is a toy.",
        territory: "nature",
        style: { tone: "playful", scale: "small", lens: "concrete", focus: "worldly" },
      },
      {
        text: "Who first noticed?",
        whisper: "Someone wrote it down.",
        territory: "history",
        style: { tone: "serious", scale: "vast", lens: "abstract", focus: "personal" },
      },
    ]);
  });

  it("drops repeats, questions without a whisper, and non-questions; ignores unknown territories", async () => {
    const { provider } = fakeProvider(
      reply([
        { q: "Already shown?", w: "x", t: "art", s: "playful" },
        { q: "No whisper here?" },
        { q: "Not a question", w: "x", t: "art", s: "playful" },
        { q: "A fresh one?", w: "fresh", t: "made-up-place", s: "serious" },
        { q: "a FRESH one?", w: "same words, different case", t: "art", s: "serious" },
      ]),
    );
    const events = await collect(
      streamQuestions(provider, { ...base, question: "Root?", mode: "deeper", exclude: ["Already shown?"] }),
    );
    const qs = questionsOf(events);
    expect(qs.map((q) => q.text)).toEqual(["A fresh one?"]);
    expect(qs[0].territory).toBeUndefined();
  });

  it("caps Deeper at 4 questions and Astray at a field of 10", async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ q: `Question ${i}?`, w: "w", t: "art", s: "playful" }));
    const deeper = await collect(streamQuestions(fakeProvider(reply(many)).provider, { ...base, question: "Q?", mode: "deeper" }));
    const astray = await collect(streamQuestions(fakeProvider(reply(many)).provider, { ...base, question: "Q?", mode: "astray" }));
    expect(questionsOf(deeper)).toHaveLength(4);
    expect(questionsOf(astray)).toHaveLength(10);
  });

  it("flags care from the question itself, before the model says anything", async () => {
    const { provider, calls } = fakeProvider(reply([{ q: "Who could you talk to tonight?", w: "w", t: "people", s: "serious" }]));
    const events = await collect(streamQuestions(provider, { ...base, question: "I want to die", mode: "stranger" }));
    expect(events[0]).toEqual({ type: "care" });
    // Care overrides the mode: gentle, never the Stranger brief.
    expect(calls[0].prompt).toContain("Care first");
    expect(calls[0].prompt).not.toContain("GO STRANGER");
  });

  it("passes on the model's own CARE flag once", async () => {
    const { provider } = fakeProvider(reply([{ q: "One?", w: "w", t: "mind", s: "serious" }], "yes"));
    const events = await collect(streamQuestions(provider, { ...base, question: "Everything feels heavy", mode: "deeper" }));
    expect(events.filter((e) => e.type === "care")).toHaveLength(1);
  });

  it("briefs Astray against the person's habits, and Deeper gently towards them", async () => {
    const profile = { leans: ["playful", "small"], picks: ["Why do we name cars?"], skips: ["Is maths invented?"] };
    const astray = fakeProvider(reply([{ q: "One?", w: "w", t: "art", s: "serious" }]));
    await collect(streamQuestions(astray.provider, { ...base, question: "Q?", mode: "astray", habits: ["people"], profile }));
    expect(astray.calls[0].prompt).toContain("anti-algorithm");
    expect(astray.calls[0].prompt).toContain("Write ones that are serious, vast instead");
    expect(astray.calls[0].prompt).toContain("Is maths invented?");

    const deeper = fakeProvider(reply([{ q: "One?", w: "w", t: "art", s: "serious" }]));
    await collect(streamQuestions(deeper.provider, { ...base, question: "Q?", mode: "deeper", habits: ["people"], profile }));
    expect(deeper.calls[0].prompt).toContain("Let two of the four questions lean gently towards that taste");
  });

  it("grows from an answer to the rabbit without replying to it", async () => {
    const { provider, calls } = fakeProvider(reply([{ q: "What do buttons outlive?", w: "w", t: "everyday", s: "playful" }]));
    const answer = { asked: "What's in your kitchen drawer?", said: "A tin of buttons" };
    const events = await collect(streamQuestions(provider, { ...base, question: answer.said, mode: "astray", answer }));
    expect(questionsOf(events)).toHaveLength(1);
    expect(calls[0].prompt).toContain("<asked>What's in your kitchen drawer?</asked>");
    expect(calls[0].prompt).toContain("Never reply to, praise, judge or interpret");
  });

  it("only errors when nothing usable arrived", async () => {
    await expect(
      collect(streamQuestions(fakeProvider("CARE: no\nnonsense").provider, { ...base, question: "Q?", mode: "deeper" })),
    ).rejects.toThrow("The questions got lost");

    const one = await collect(
      streamQuestions(fakeProvider(reply([{ q: "Just one?", w: "w", t: "art", s: "serious" }])).provider, {
        ...base,
        question: "Q?",
        mode: "deeper",
      }),
    );
    expect(questionsOf(one)).toHaveLength(1);
  });
});
