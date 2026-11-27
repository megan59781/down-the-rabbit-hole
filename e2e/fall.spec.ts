import { expect, expectHolding, fallError, risingQuestions, startFall, test } from "./support/fixtures";

// The rising questions drift forever, so they're never "still" for Playwright's click checks.
// Reduced motion stops the drift; the one test that needs the full animations clicks with force.
test.describe("the fall (reduced motion)", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("ask, fall in, dive, look up and jump back", async ({ page }) => {
    await startFall(page);
    await expect(risingQuestions(page)).toHaveCount(4);

    const first = await risingQuestions(page).first().locator("span.font-display").innerText();
    await risingQuestions(page).first().click();
    await expectHolding(page, first.replace(/^\?\s*/, ""));
    await expect(page.getByText("1 down · you're holding")).toBeVisible();
    await expect(risingQuestions(page)).toHaveCount(4);

    await page.getByRole("button", { name: "↑ Look up" }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByText("Why do cats knock things off tables?")).toBeVisible();
    await panel.getByRole("button", { name: /Why do cats knock things off tables\?/ }).click();
    await expectHolding(page, "Why do cats knock things off tables?");
  });

  test("switching direction asks for new questions in that direction", async ({ page }) => {
    await startFall(page);
    await expect(risingQuestions(page)).toHaveCount(4);
    const request = page.waitForRequest((r) => r.url().endsWith("/api/questions") && r.postDataJSON().mode === "stranger");
    await page.getByRole("radio", { name: /Stranger/ }).click();
    await request;
    await expect(page.getByRole("radio", { name: /Stranger/ })).toHaveAttribute("aria-checked", "true");
    await expect(risingQuestions(page)).toHaveCount(4);
  });

  test("Let others rise brings a fresh set, and keeps working after many rounds", async ({ page }) => {
    await startFall(page);
    for (let round = 0; round < 11; round++) {
      await expect(risingQuestions(page)).toHaveCount(4);
      await page.getByRole("button", { name: "↻ Let others rise" }).click();
    }
    // Over 40 earlier questions by now: the request must still be accepted (it was capped).
    await expect(fallError(page)).toHaveCount(0);
    await expect(risingQuestions(page)).toHaveCount(4);
  });

  test("share your fall as a card", async ({ page }) => {
    await startFall(page);
    await risingQuestions(page).first().click();
    await page.getByRole("button", { name: "↑ Look up" }).click();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Share" });
    await expect(sheet.getByRole("radio", { name: "Story" })).toHaveAttribute("aria-checked", "true");
    const card = sheet.getByRole("img", { name: /share card/i });
    await expect(card).toBeVisible();
    expect(await card.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1080, 1920]);
    // The caption stays hidden until you've shared.
    await expect(sheet.getByText(/I fell 1 question down the rabbit hole/)).toHaveCount(0);
  });
});

test.describe("leaving and coming back (full motion)", () => {
  test.use({ contextOptions: { reducedMotion: "no-preference" } });

  // Regression: climbing out used to replay the jump-in over the landing page and leave it black.
  test("New question climbs out to a clean landing page, and the last fall is still there", async ({ page }) => {
    await startFall(page, "What if cities could remember?");
    await expect(risingQuestions(page)).toHaveCount(4);

    await page.getByRole("link", { name: "New question" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("heading", { name: /another way/ })).toBeVisible();
    await expect(page.getByLabel("Your question")).toHaveValue("");
    // Nothing left covering the page: no jump-in, no climb-out.
    await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

    await page.getByRole("link", { name: /Return to your last fall/ }).click();
    await expectHolding(page, "What if cities could remember?");
    await expect(page.locator("div.fixed.inset-0.z-50")).toHaveCount(0);

    // And a second fall still works after all that.
    await page.getByRole("link", { name: "New question" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.getByLabel("Your question").fill("Why is yawning contagious?");
    await page.getByLabel("Your question").press("Enter");
    await expectHolding(page, "Why is yawning contagious?");
  });
});
