import {
  addQuestions,
  addRabbitAnswer,
  childrenOf,
  createSession,
  getNode,
  pathTo,
  risingFrom,
  setPassedOver,
} from "@/lib/session/tree";

const gen = (...texts: string[]) => texts.map((text) => ({ text, whisper: "w" }));

describe("the question tree", () => {
  it("starts a fall holding the question, falling Deeper", () => {
    const s = createSession("Why do we keep things?");
    expect(s.nodes).toHaveLength(1);
    expect(s.focusId).toBe(s.nodes[0].id);
    expect(s.mode).toBe("deeper");
  });

  it("adds questions under a node, skipping repeats (any case)", () => {
    let s = createSession("Root?");
    const root = s.focusId;
    s = addQuestions(s, root, gen("A?", "B?"), "deeper");
    s = addQuestions(s, root, gen("a?", "C?"), "deeper");
    expect(childrenOf(s, root).map((n) => n.text)).toEqual(["A?", "B?", "C?"]);
  });

  it("rises the newest four of the current direction, never your answers to the rabbit", () => {
    let s = createSession("Root?");
    const root = s.focusId;
    s = addQuestions(s, root, gen("D1?", "D2?", "D3?", "D4?", "D5?"), "deeper");
    s = addQuestions(s, root, gen("S1?"), "stranger");
    s = addRabbitAnswer(s, root, "What's in your drawer?", "Buttons", "deeper").session;
    expect(risingFrom(s, root, "deeper").map((n) => n.text)).toEqual(["D2?", "D3?", "D4?", "D5?"]);
    expect(risingFrom(s, root, "stranger").map((n) => n.text)).toEqual(["S1?"]);
  });

  it("keeps an answer to the rabbit as a step in the path", () => {
    let s = createSession("Root?");
    s = addQuestions(s, s.focusId, gen("A?"), "deeper");
    const a = childrenOf(s, s.focusId)[0].id;
    const { session, id } = addRabbitAnswer(s, a, "What can you hear?", "Rain", "stranger");
    const node = getNode(session, id)!;
    expect(node).toMatchObject({ text: "What can you hear?", answer: "Rain", mode: "stranger", parentId: a });
    expect(pathTo(session, id).map((n) => n.answer ?? n.text)).toEqual(["Root?", "A?", "Rain"]);
  });

  it("remembers what Astray turned down", () => {
    const s = createSession("Root?");
    const next = setPassedOver(s, s.focusId, [{ text: "Too you?", territory: "science" }]);
    expect(getNode(next, s.focusId)?.passedOver).toEqual([{ text: "Too you?", territory: "science" }]);
    expect(getNode(s, s.focusId)?.passedOver).toBeUndefined(); // the old session is untouched
  });
});
