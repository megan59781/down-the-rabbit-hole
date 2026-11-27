/** @jest-environment jsdom */
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { BeginJourney } from "@/components/landing/BeginJourney";
import { anySignal } from "@/lib/explore/client";
import { renderCard, type PathStep } from "@/lib/share/cards";
import { sessionStore } from "@/lib/storage/sessions";
import { makeSession } from "../support/session";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }) }));

describe("share cards for short falls", () => {
  // jsdom has no canvas, so stand in a 2D context that records the text it's asked to draw.
  const drawn: string[] = [];
  beforeAll(() => {
    const ctx = new Proxy(
      {},
      {
        get: (_, prop) => {
          if (prop === "measureText") return (text: string) => ({ width: text.length * 14 });
          if (prop === "fillText") return (text: string) => drawn.push(text);
          if (prop === "createRadialGradient" || prop === "createLinearGradient") return () => ({ addColorStop() {} });
          return () => {};
        },
        set: () => true,
      },
    );
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    jest
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((done: BlobCallback) => done(new Blob(["png"], { type: "image/png" })));
    Object.defineProperty(document, "fonts", { value: { load: async () => [] }, configurable: true });
    (globalThis as unknown as { Path2D: unknown }).Path2D = class {};
  });
  beforeEach(() => (drawn.length = 0));

  const step = (text: string): PathStep => ({ text, mode: "deeper" });

  it.each([
    [[step("Only question?")]],
    [[step("First question?"), step("Second question?")]],
    [[step("One?"), step("Two?"), step("Three?")]],
  ])("draws a fall of %#+1 step(s) in full, with no gap", async (steps) => {
    await renderCard({ kind: "path", format: "story", data: { steps, includeAnswers: false } });
    expect(drawn.filter((t) => t.includes("more question"))).toEqual([]);
    for (const s of steps) expect(drawn.filter((t) => t === s.text)).toHaveLength(1);
  });
});

describe("anySignal", () => {
  it("aborts when either signal does, even without AbortSignal.any (older Safari)", () => {
    const real = AbortSignal.any;
    (AbortSignal as unknown as { any?: unknown }).any = undefined;
    try {
      const a = new AbortController();
      const b = new AbortController();
      const both = anySignal(a.signal, b.signal);
      expect(both.aborted).toBe(false);
      b.abort();
      expect(both.aborted).toBe(true);
    } finally {
      AbortSignal.any = real;
    }
  });
});

describe("session storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the falls you've used most recently, and returns you to the last one you were in", () => {
    const old = { ...makeSession([["r", null, "Old fall?"]], "r"), id: "old", createdAt: "2026-01-01T00:00:00.000Z" };
    sessionStore.save(old);
    for (let i = 0; i < 20; i++) {
      sessionStore.save({ ...makeSession([["r", null, `Newer ${i}?`]], "r"), id: `new-${i}`, createdAt: `2026-02-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` });
    }
    // Carrying on with the old fall keeps it, even with 20 newer ones.
    sessionStore.save(old);
    expect(sessionStore.get("old")).not.toBeNull();
    expect(sessionStore.latestId()).toBe("old");
  });
});

describe("<BeginJourney> in React's development checks", () => {
  it("keeps what you type even though StrictMode runs effects twice", async () => {
    const user = userEvent.setup();
    render(
      <StrictMode>
        <BeginJourney />
      </StrictMode>,
    );
    await user.type(screen.getByLabelText("Your question"), "Why is yawning contagious?");
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByLabelText("Your question")).toHaveValue("Why is yawning contagious?");
  });
});
