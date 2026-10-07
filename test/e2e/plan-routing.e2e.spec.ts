import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { beforeAll, describe, expect, it } from "vitest";
/* eslint-disable node/no-process-env */

const seededPlanId = "f530083d-8c74-4f10-931a-dd877ee7b52c";
const seededPlanUrl = process.env.E2E_PLAN_URL || `/plans/${seededPlanId}#key=tWVZ4hmOA7LFsrNViX1X6w`;
const testHost = process.env.TEST_HOST;
const testUrl = (pathname: string) => testHost ? new URL(pathname, testHost).toString() : url(pathname);
const seededPlanHash = new URL(seededPlanUrl, testHost || "http://localhost").hash;

describe("plan-scoped routing", async () => {
  await setup({ host: testHost, dev: true });

  beforeAll(async () => {
    if (process.env.E2E_PLAN_URL)
      return;
    const fixture = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/encrypted-plan-2025-2026.json"), "utf8"));
    await fetch(testUrl(`/api/${seededPlanId}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob: fixture.blob }),
    });
  });

  it("keeps schedule, match, cockpit, team, and assignment navigation in plan context", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByText("Season fixtures, helper schedules, and real-time duty tracking.").waitFor();

    await page.getByRole("button", { name: "Calendar" }).click();
    await page.locator("[id^='calendar-']").first().waitFor();
    await page.getByRole("button", { name: "Timeline" }).click();

    const matchLink = page.locator("a[href*='/matches/']").first();
    const matchHref = await matchLink.getAttribute("href");
    expect(matchHref).toBeTruthy();
    const matchUrl = new URL(matchHref!, page.url());
    const planId = matchUrl.pathname.split("/")[2];
    expect(planId).toBeTruthy();
    expect(matchUrl.hash).toBe(seededPlanHash);
    await page.goto(matchUrl.toString(), { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toMatch(/^\/plans\/[^/]+\/matches\/[^/]+$/);
    const allFixturesLink = page.locator(`a[href^="/plans/${planId}"]`).first();
    await allFixturesLink.waitFor();
    const allFixturesUrl = new URL(await allFixturesLink.getAttribute("href")!, page.url());
    expect(allFixturesUrl.pathname).toBe(`/plans/${planId}`);
    expect(await page.getByText("Claiming as").count()).toBe(0);

    const planUrl = new URL(page.url());
    planUrl.pathname = `/plans/${planId}/cockpit`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe(`/plans/${planId}/cockpit`);

    planUrl.pathname = `/plans/${planId}/teams`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe(`/plans/${planId}/teams`);

    planUrl.pathname = `/plans/${planId}/assignments`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe(`/plans/${planId}/assignments`);
    await page.close();
  }, 90000);

  it("edits, saves, reloads, and recovers from a failed plan load", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${seededPlanId}/setup${seededPlanHash}`), { waitUntil: "domcontentloaded" });
    await page.getByLabel("Club name").waitFor();

    const clubName = page.locator("input").first();
    await clubName.fill("Browser Edited Club");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Saved").waitFor();
    await page.getByRole("button", { name: "Reload from server" }).click();
    expect(await clubName.inputValue()).toBe("Browser Edited Club");

    await page.goto(testUrl(`/plans/missing-plan/setup#key=test-key`), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Could not load plan" }).waitFor();
    await page.getByRole("link", { name: "Return to plan" }).waitFor();
    await page.close();
  }, 90000);

  it("lets the cockpit own member selection", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${seededPlanId}/cockpit${seededPlanHash}`), { waitUntil: "domcontentloaded" });

    await page.getByRole("heading", { name: "My Duties" }).waitFor();
    const memberProfile = page.getByLabel("Member profile");
    expect(await memberProfile.count()).toBeGreaterThan(0);
    await memberProfile.selectOption({ index: 1 });
    const selectedMember = await memberProfile.inputValue();
    expect(await page.evaluate(planId => JSON.parse(localStorage.getItem("gameday-selected-member") || "{}")?.[planId], seededPlanId)).toBe(selectedMember);
    await page.close();
  }, 90000);

  it("copies a canonical share link and reports clipboard failure", async () => {
    const page = await createPage();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByText("Season fixtures, helper schedules, and real-time duty tracking.").waitFor();
    await page.getByRole("button", { name: "Copy share link" }).click();
    const status = page.getByRole("status").filter({ hasText: "Share link copied." });
    await status.waitFor();
    expect(await status.textContent()).toContain("copied");
    await page.close();
  }, 90000);

  it("shows a recovery message when sharing cannot copy", async () => {
    const page = await createPage();
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("denied"); } },
    }));
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByText("Season fixtures, helper schedules, and real-time duty tracking.").waitFor();
    await page.getByRole("button", { name: "Copy share link" }).click();
    const alert = page.getByRole("alert");
    await alert.waitFor();
    expect(await alert.textContent()).toContain("Could not copy");
    await page.close();
  }, 90000);
});
