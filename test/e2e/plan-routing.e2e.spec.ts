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
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Gladbeck HC" }).waitFor();

    await page.getByRole("button", { name: "Calendar" }).click();
    await page.locator("[id^='calendar-']").first().waitFor();
    await page.getByRole("button", { name: "Timeline" }).click();

    const matchLink = page.locator("a[href*='/matches/']").first();
    expect(await matchLink.getAttribute("href")).toBeTruthy();
    const matchUrl = new URL(seededPlanUrl, testUrl("/"));
    matchUrl.pathname = `/plans/${seededPlanId}/matches/match-2025-10-04-ejgd-0`;
    await page.goto(matchUrl.toString(), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: / vs / }).waitFor();
    expect(new URL(page.url()).pathname).toMatch(/^\/plans\/[^/]+\/matches\/[^/]+$/);

    const planUrl = new URL(page.url());
    planUrl.pathname = `/plans/${seededPlanId}/cockpit`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "My duties" }).waitFor();
    expect(new URL(page.url()).pathname).toBe(`/plans/${seededPlanId}/cockpit`);

    planUrl.pathname = `/plans/${seededPlanId}/teams`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Teams" }).waitFor();

    planUrl.pathname = `/plans/${seededPlanId}/assignments`;
    await page.goto(planUrl.toString(), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Duty Assignments" }).waitFor();
    await page.close();
  }, 90000);
});
