import { ndjsonWriter } from "@/lib/ai/ndjson";
import { clip, isQuestion } from "@/lib/ai/sanitize";
import { isTerritory, opposite, parseStyle, territoryAngle, TERRITORIES } from "@/lib/astray/territories";
import { MAX_EXCLUDE, QuestionEventSchema, QuestionsRequestSchema } from "@/lib/schemas";
import { displayUrl, siteUrl } from "@/lib/site";

describe("sanitize", () => {
  it("trims, collapses whitespace and caps length with an ellipsis", () => {
    expect(clip("  a   b \n c ", 50)).toBe("a b c");
    expect(clip("abcdefghij", 5)).toBe("abcd…");
    expect(clip(undefined, 5)).toBe("");
  });

  it("knows a question when it sees one", () => {
    expect(isQuestion("Hm?")).toBe(false); // too short to be real
    expect(isQuestion("Why?")).toBe(true);
    expect(isQuestion("Why not?")).toBe(true);
    expect(isQuestion("A statement.")).toBe(false);
  });
});

describe("territories and style", () => {
  it("reads a style line in any order, ignoring extras", () => {
    expect(parseStyle("Vast, PLAYFUL; abstract / personal, sparkly")).toEqual({
      scale: "vast",
      tone: "playful",
      lens: "abstract",
      focus: "personal",
    });
    expect(parseStyle("nonsense")).toBeUndefined();
  });

  it("knows the other end of each axis", () => {
    expect(opposite("playful")).toBe("serious");
    expect(opposite("worldly")).toBe("personal");
  });

  it("gives every territory its own compass direction", () => {
    const angles = TERRITORIES.map(territoryAngle);
    expect(new Set(angles).size).toBe(TERRITORIES.length);
    expect(isTerritory("science")).toBe(true);
    expect(isTerritory("astrology")).toBe(false);
  });
});

describe("request validation", () => {
  const valid = { question: "  Why?  ", mode: "deeper" };

  it("trims the question and fills defaults", () => {
    expect(QuestionsRequestSchema.parse(valid)).toMatchObject({ question: "Why?", path: [], exclude: [], habits: [] });
  });

  it("accepts up to MAX_EXCLUDE already-rising questions and no more", () => {
    const list = (n: number) => Array.from({ length: n }, (_, i) => `Q${i}?`);
    expect(QuestionsRequestSchema.safeParse({ ...valid, exclude: list(MAX_EXCLUDE) }).success).toBe(true);
    expect(QuestionsRequestSchema.safeParse({ ...valid, exclude: list(MAX_EXCLUDE + 1) }).success).toBe(false);
  });

  it("refuses unknown directions and territories", () => {
    expect(QuestionsRequestSchema.safeParse({ ...valid, mode: "sideways" }).success).toBe(false);
    expect(QuestionsRequestSchema.safeParse({ ...valid, habits: ["astrology"] }).success).toBe(false);
  });

  it("validates streamed events in the browser too", () => {
    expect(QuestionEventSchema.safeParse({ type: "question", question: { text: "Q?", whisper: "w" } }).success).toBe(true);
    expect(
      QuestionEventSchema.safeParse({ type: "question", question: { text: "Q?", whisper: "w", territory: "astrology" } })
        .success,
    ).toBe(false);
  });
});

describe("ndjsonWriter", () => {
  const controller = () => ({ enqueue: jest.fn(), close: jest.fn() }) as unknown as ReadableStreamDefaultController<Uint8Array> & {
    enqueue: jest.Mock;
    close: jest.Mock;
  };

  it("writes one JSON object per line", () => {
    const c = controller();
    ndjsonWriter(c, new AbortController().signal).send({ type: "done" });
    expect(new TextDecoder().decode(c.enqueue.mock.calls[0][0])).toBe('{"type":"done"}\n');
  });

  it("goes quiet once the visitor has left, instead of throwing", () => {
    const c = controller();
    const abort = new AbortController();
    const writer = ndjsonWriter(c, abort.signal);
    abort.abort();
    writer.send({ type: "done" });
    expect(c.enqueue).not.toHaveBeenCalled();

    const gone = controller();
    gone.enqueue.mockImplementation(() => {
      throw new TypeError("Invalid state");
    });
    gone.close.mockImplementation(() => {
      throw new TypeError("Invalid state");
    });
    const w = ndjsonWriter(gone, new AbortController().signal);
    expect(() => w.send({ a: 1 })).not.toThrow();
    expect(() => w.close()).not.toThrow();
  });
});

describe("site links", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("uses the configured address, tidied", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://hole.example/ ";
    expect(siteUrl()).toBe("https://hole.example");
    expect(displayUrl(siteUrl())).toBe("hole.example");
  });
});
