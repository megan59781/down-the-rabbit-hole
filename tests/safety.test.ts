import { checkRateLimit, clientIdOf, isSameOrigin, needsCare } from "@/lib/ai/safety";

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) }) as unknown as Request;

describe("needsCare", () => {
  it.each([
    "I want to die",
    "thinking about suicide",
    "should I hurt myself",
    "I want to end my life",
    "everyone would be better off without me",
    "there's no point in living",
  ])("catches %p", (text) => expect(needsCare(text)).toBe(true));

  it.each([
    "Why do sad songs hurt me so much?",
    "Why do cats knock things off tables?",
    "What would money look like if it expired?",
    "Why does time go faster as we get older?",
  ])("leaves %p alone", (text) => expect(needsCare(text)).toBe(false));
});

describe("checkRateLimit", () => {
  it("allows 40 a minute per visitor, then asks them to slow down, then lets them back in", () => {
    const now = Date.UTC(2026, 0, 1, 12);
    for (let i = 0; i < 40; i++) expect(checkRateLimit("visitor-a", now + i).ok).toBe(true);
    const blocked = checkRateLimit("visitor-a", now + 100);
    expect(blocked).toMatchObject({ ok: false, retryAfter: 30 });
    expect(checkRateLimit("visitor-b", now + 100).ok).toBe(true); // others aren't affected
    expect(checkRateLimit("visitor-a", now + 61_000).ok).toBe(true);
  });
});

describe("isSameOrigin", () => {
  it("accepts our own pages and refuses other sites", () => {
    expect(isSameOrigin(req({ origin: "https://hole.example", host: "hole.example" }))).toBe(true);
    expect(isSameOrigin(req({ origin: "https://evil.example", host: "hole.example" }))).toBe(false);
    expect(isSameOrigin(req({ origin: "not a url", host: "hole.example" }))).toBe(false);
  });

  it("allows requests without an Origin outside production (local tools, tests)", () => {
    expect(isSameOrigin(req({ host: "localhost:3000" }))).toBe(true);
  });
});

describe("clientIdOf", () => {
  it("prefers the address the platform sets over one the visitor could forge", () => {
    expect(clientIdOf(req({ "x-vercel-forwarded-for": "1.1.1.1", "x-forwarded-for": "9.9.9.9" }))).toBe("1.1.1.1");
    expect(clientIdOf(req({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "9.9.9.9" }))).toBe("2.2.2.2");
    expect(clientIdOf(req({ "x-forwarded-for": "3.3.3.3, 4.4.4.4" }))).toBe("3.3.3.3");
    expect(clientIdOf(req({}))).toBe("local");
  });
});
