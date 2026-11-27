import { expect, expectHolding, risingQuestions, startFall, test } from "./support/fixtures";

test.use({ contextOptions: { reducedMotion: "reduce" } });

test("the tour is offered on a new fall, and asks before ending if you click away", async ({ page }) => {
  await startFall(page);
  await page.getByRole("button", { name: "Take the tour" }).click();
  await expect(page.getByText("The question you're holding")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Questions rise", { exact: true })).toBeVisible();

  await page.mouse.click(5, 5); // the dimmed hole around the card
  await expect(page.getByText("End the tour?")).toBeVisible();
  await page.getByRole("button", { name: "End tour" }).click();
  await expect(page.getByText("End the tour?")).toHaveCount(0);

  // Taken: not offered again on the next fall, but the ? still brings it back.
  await startFall(page, "What if the moon had a smell?");
  await expect(risingQuestions(page)).toHaveCount(4);
  await expect(page.getByText("First time down here?")).toHaveCount(0);
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByText("The question you're holding")).toBeVisible();
});

test("catch the rabbit: it tests itself, asks, and your answer grows new questions", async ({ page }) => {
  test.setTimeout(45_000);
  await startFall(page);
  // The rabbit shows itself after a few seconds (with reduced motion it sits still to be caught).
  await page.getByRole("button", { name: /Catch the rabbit/ }).click({ timeout: 25_000 });
  await expect(page.getByText(/I know this one: Rayleigh scattering/)).toBeVisible();

  const answer = page.getByPlaceholder("Just a sentence…");
  await expect(answer).toBeFocused(); // ready to type as soon as it asks
  await answer.fill("The fridge humming");
  await answer.press("Enter");
  await expectHolding(page, "“The fridge humming”");
  await expect(page.getByText("You told the rabbit")).toBeVisible();
  await expect(risingQuestions(page)).toHaveCount(4);
});

test("Astray picks four from a wider field, even without the meaning model", async ({ page }) => {
  await startFall(page);
  await expect(risingQuestions(page)).toHaveCount(4);
  const request = page.waitForRequest((r) => r.url().endsWith("/api/questions") && r.postDataJSON().mode === "astray");
  await page.getByRole("radio", { name: /Astray/ }).click();
  await request;
  await expect(risingQuestions(page)).toHaveCount(4); // of the 10 the mocked AI wrote
  await expect(page.getByText("Learning what you reach for, so it can lead you elsewhere.")).toBeVisible();
});

test("on a phone, nothing overlaps, even with a very long question", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The stacked phone layout");
  const long =
    "Why do I keep every single birthday card I have ever been given in a shoebox under my bed, even the ones from people I barely remember?";
  await startFall(page, long);
  await expect(risingQuestions(page)).toHaveCount(4);
  const boxes = await page.evaluate(() => {
    const rect = (el: Element) => el.getBoundingClientRect();
    return [
      rect(document.querySelector('[data-tour="held"]')!),
      rect(document.querySelector("header")!),
      ...[...document.querySelectorAll("button.group > span.relative")].map(rect),
    ].map((r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }));
  });
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      const overlap = a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      expect(overlap, `boxes ${i} and ${j} overlap`).toBe(false);
    }
  }
});

test("the landing page explains itself", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "How it works" }).click();
  await expect(page.getByRole("dialog")).toContainText("A place for questions");
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Ask a question. Follow it down the hole.")).toBeVisible();
});
