import { askRabbit } from "@/lib/ai/rabbit";
import { collect, fakeProvider } from "./support/fakeProvider";

describe("askRabbit (the self-test)", () => {
  it("asks the first candidate the AI could not answer itself", async () => {
    const { provider, calls } = fakeProvider(
      "Q: What sound is nearest you?\nQ: Why is the sky blue?\nQ: Who taught you to fold towels?",
      "1: UNKNOWN - maybe a fan\n2: KNOWN - Rayleigh scattering\n3: UNKNOWN - a parent, guessing",
    );
    const events = await collect(askRabbit(provider, "Why do we keep things?"));
    expect(events.filter((e) => e.type === "candidate")).toHaveLength(3);
    expect(events).toContainEqual({ type: "verdict", index: 1, known: true, attempt: "Rayleigh scattering" });
    expect(events.at(-1)).toEqual({ type: "ask", index: 0 });
    // The judge sees only the numbered candidates, never the person's question.
    expect(calls[1].prompt).toBe("1. What sound is nearest you?\n2. Why is the sky blue?\n3. Who taught you to fold towels?");
  });

  it("writes more personal questions when it could answer all of them, numbering on from the first round", async () => {
    const { provider, calls } = fakeProvider(
      "Q: What is 2+2?\nQ: Why is grass green?\nQ: What is water made of?",
      "1: KNOWN - 4\n2: KNOWN - chlorophyll\n3: KNOWN - H2O",
      "Q: What did you dream last night?\nQ: Whose handwriting do you miss?\nQ: What's on your windowsill?",
      "1: UNKNOWN - no idea\n2: UNKNOWN - a grandparent?\n3: KNOWN - a plant",
    );
    const events = await collect(askRabbit(provider, "Q?"));
    expect(calls[2].prompt).toContain("The rabbit could answer these itself");
    expect(events.at(-1)).toEqual({ type: "ask", index: 3 });
  });

  it("gives up after two rounds of questions it already knows", async () => {
    const known = "1: KNOWN - a\n2: KNOWN - b\n3: KNOWN - c";
    const { provider } = fakeProvider("Q: A?\nQ: B?\nQ: C?", known, "Q: D?\nQ: E?\nQ: F?", known);
    await expect(collect(askRabbit(provider, "Q?"))).rejects.toThrow("didn't already know");
  });
});
