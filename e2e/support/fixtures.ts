import { test as base, expect, type Page, type Route } from "@playwright/test";

export { expect };

const TERRITORIES = ["science", "nature", "history", "art", "myth", "people", "money", "space", "mind", "everyday"];

let counter = 0;

/** Questions the mocked AI "writes": unique, and long enough to wrap like real ones. */
function questionsFor(held: string, count: number) {
  const set = ++counter;
  return Array.from({ length: count }, (_, i) => ({
    text: `Mock question ${set}.${i + 1}: what if "${held.slice(0, 24)}" were seen from somewhere else?`,
    whisper: `A small whisper, number ${i + 1}.`,
    territory: TERRITORIES[(set + i) % TERRITORIES.length],
    style: { tone: i % 2 ? "serious" : "playful", scale: "small", lens: "concrete", focus: "worldly" },
  }));
}

const ndjson = (events: unknown[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";

async function answerQuestions(route: Route) {
  const body = route.request().postDataJSON() as { question: string; mode: string; answer?: unknown };
  const count = body.mode === "astray" && !body.answer ? 10 : 4;
  const events = [...questionsFor(body.question, count).map((question) => ({ type: "question", question })), { type: "done" }];
  await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson(events) });
}

async function answerRabbit(route: Route) {
  const events = [
    { type: "candidate", index: 0, text: "Why is the sky blue?" },
    { type: "candidate", index: 1, text: "What can you hear right now?" },
    { type: "candidate", index: 2, text: "Who taught you to tie your shoes?" },
    { type: "verdict", index: 0, known: true, attempt: "Rayleigh scattering." },
    { type: "verdict", index: 1, known: false, attempt: "Maybe a fan?" },
    { type: "verdict", index: 2, known: false, attempt: "A parent, guessing." },
    { type: "ask", index: 1 },
    { type: "done" },
  ];
  await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: ndjson(events) });
}

/** Every page gets the mocked AI, and no third-party downloads (Astray falls back to territories). */
export const test = base.extend({
  // Playwright calls this "use"; renamed so React's hook rules don't mistake it for React's use().
  page: async ({ page }, provide) => {
    await page.route("**/api/questions", answerQuestions);
    await page.route("**/api/rabbit", answerRabbit);
    await page.route(/cdn\.jsdelivr\.net|huggingface\.co/, (route) => route.abort());
    await provide(page);
  },
});

/** Ask a question on the landing page and land in the fall. */
export async function startFall(page: Page, question = "Why do cats knock things off tables?") {
  await page.goto("/");
  await page.getByLabel("Your question").fill(question);
  await page.getByLabel("Your question").press("Enter");
  await page.waitForURL(/\/explore\//);
  await expectHolding(page, question);
}

// Visible elements only: Next keeps earlier pages alive (hidden) after you navigate, and the
// question you were holding is still fading out for a moment after you dive.

/** Wait until the question (or answer) at the heart of the hole is `text`. */
export async function expectHolding(page: Page, text: string) {
  await expect(
    page.locator('[data-tour="held"] h1').filter({ visible: true }).filter({ hasText: text }).first(),
  ).toBeVisible();
}

/** The questions rising around the one you're holding. */
export const risingQuestions = (page: Page) =>
  page.locator('button.group:has-text("Mock question")').filter({ visible: true });

/** The fall's own error message (not Next's invisible route announcer, which is also role=alert). */
export const fallError = (page: Page) => page.locator('p[role="alert"]');
