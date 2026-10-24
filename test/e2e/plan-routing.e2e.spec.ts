import type { Page } from "playwright";
import { Buffer } from "node:buffer";
import { randomUUID, webcrypto } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { chromium } from "playwright";
import { beforeAll, describe, expect, it } from "vitest";
import { localPlanFixtures, seedLocalPlan } from "./plan-identities";
/* eslint-disable node/no-process-env */

const defaultPlanId = localPlanFixtures.routing.id;
const defaultPlanUrl = `/plans/${defaultPlanId}#key=${localPlanFixtures.routing.key}`;
const seededPlanUrl = process.env.E2E_ROUTING_PLAN_URL || defaultPlanUrl;
const defaultEditPlanUrl = `/plans/${localPlanFixtures.editing.id}#key=${localPlanFixtures.editing.key}`;
const editPlanUrl = process.env.E2E_EDIT_PLAN_URL || defaultEditPlanUrl;
const testHost = process.env.TEST_HOST;
const testUrl = (pathname: string) => testHost ? new URL(pathname, testHost).toString() : url(pathname);
const seededPlanHash = new URL(seededPlanUrl, testHost || "http://localhost").hash;
const seededPlanKey = new URL(seededPlanUrl, testHost || "http://localhost").hash.slice("#key=".length);
const seededPlanId = new URL(seededPlanUrl, testHost || "http://localhost").pathname.split("/")[2] || defaultPlanId;
const editPlanHash = new URL(editPlanUrl, testHost || "http://localhost").hash;
const editPlanId = new URL(editPlanUrl, testHost || "http://localhost").pathname.split("/")[2] || defaultPlanId;

function monitorSharePage(page: Page) {
  const apiResponses: string[] = [];
  const documentResponses: string[] = [];
  const errors: string[] = [];
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (response.request().resourceType() === "document") {
      const headers = response.headers();
      const requestId = headers["x-request-id"] || "none";
      const errorId = headers["x-error-id"] || "none";
      documentResponses.push(`${response.status()} ${url.pathname} request-id=${requestId} error-id=${errorId}`);
    }
    if (/^\/api\/[0-9a-f-]+$/i.test(url.pathname))
      apiResponses.push(`${response.request().method()} ${response.status()}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && /Error loading plan|Failed to process/.test(message.text()))
      errors.push(message.text().replace(/#key=\S*/g, "#key=<REDACTED>").slice(0, 200));
  });

  return async (targetUrl: string) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      // Retry one transient preview-server error; persistent failures still report page/API state below.
      if (response && response.status() >= 500 && attempt === 0) {
        await page.waitForTimeout(500);
        continue;
      }

      try {
        await page.getByRole("button", { name: "Copy share link" }).waitFor({ timeout: 15000 });
        return;
      }
      catch {
        const state = await page.evaluate(() => {
          const text = document.body.textContent ?? "";
          return {
            locale: document.documentElement.lang,
            keyInUrl: new URLSearchParams(location.hash.slice(1)).has("key"),
            resumeMatchesPlan: (() => {
              try {
                return JSON.parse(localStorage.getItem("gameday-plan-resume") || "null")?.id === location.pathname.split("/")[2];
              }
              catch { return false; }
            })(),
            headings: [...document.querySelectorAll("h1, h2")].map(element => element.textContent?.trim()).filter(Boolean),
            buttons: [...document.querySelectorAll("button")].map(element => element.textContent?.trim()).filter(Boolean),
            loading: /Loading plan|Plan wird geladen/.test(text),
            loadError: /Could not open this plan|Dieser Plan konnte nicht geöffnet werden/.test(text),
            unavailable: /This plan is unavailable|Dieser Plan ist nicht verfügbar/.test(text),
          };
        });
        throw new Error(`Share page did not become ready: ${JSON.stringify({ state, documentResponses, apiResponses, errors })}`);
      }
    }
  };
}

async function seedLegacyPlan() {
  const plan = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/legacy-plan-v1.json"), "utf8"));
  const id = randomUUID();
  const keyBytes = webcrypto.getRandomValues(new Uint8Array(16));
  const keyString = Buffer.from(keyBytes).toString("base64url");
  plan.id = id;

  const key = await webcrypto.subtle.importKey("jwk", {
    k: keyString,
    alg: "A128GCM",
    ext: true,
    key_ops: ["encrypt", "decrypt"],
    kty: "oct",
  }, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(12) },
    key,
    new TextEncoder().encode(JSON.stringify(plan)),
  );
  const response = await fetch(testUrl(`/api/${id}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blob: Buffer.from(encrypted).toString("base64"), expectedRevision: 0 }),
  });
  if (!response.ok)
    throw new Error(`Could not seed legacy plan: ${response.status}`);

  return { id, keyString };
}

describe("plan-scoped routing", async () => {
  await setup({ host: testHost, dev: true });

  beforeAll(async () => {
    if (!process.env.E2E_ROUTING_PLAN_URL) {
      await seedLocalPlan(defaultPlanId, localPlanFixtures.routing.key, testUrl);
    }
    if (!process.env.E2E_EDIT_PLAN_URL) {
      await seedLocalPlan(localPlanFixtures.editing.id, localPlanFixtures.editing.key, testUrl);
    }
  });

  it("shows the link-first empty state at the base route without resuming a plan", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl("/"), { waitUntil: "domcontentloaded" });

    await page.getByRole("heading", { name: "Open your helper plan" }).waitFor();
    await page.getByText("A shared plan link is required to get started.").waitFor();
    expect(await page.getByRole("button", { name: "Resume plan" }).count()).toBe(0);
    expect(await page.getByRole("link", { name: "Set up a new plan" }).count()).toBe(1);
    await page.close();
  });

  it("keeps schedule, match, cockpit, team, and assignment navigation in plan context", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByText("Season fixtures, helper schedules, and real-time duty tracking.").waitFor();

    await page.getByRole("button", { name: "Calendar" }).click();
    await page.locator("[id^='calendar-']").first().waitFor();
    await page.getByRole("button", { name: "Timeline" }).click();
    expect(await page.locator("[id^='calendar-']").count()).toBe(0);

    const matchLink = page.locator("a[href*='/matches/']").first();
    const matchHref = await matchLink.getAttribute("href");
    expect(matchHref).toBeTruthy();
    const matchUrl = new URL(matchHref!, page.url());
    const planId = matchUrl.pathname.split("/")[2];
    expect(planId).toBeTruthy();
    expect(matchUrl.hash).toBe(seededPlanHash);
    await matchLink.click();
    expect(new URL(page.url()).pathname).toMatch(/^\/plans\/[^/]+\/matches\/[^/]+$/);
    const allFixturesLink = page.getByRole("link", { name: /All fixtures/ });
    const allFixturesUrl = new URL(await allFixturesLink.getAttribute("href")!, page.url());
    expect(allFixturesUrl.pathname).toBe(`/plans/${planId}`);
    expect(allFixturesUrl.hash).toBe(seededPlanHash);
    expect(await page.getByText("Claiming as").count()).toBe(0);
    await allFixturesLink.click();
    await page.getByRole("button", { name: "Copy share link" }).waitFor();

    const teamsLink = page.getByRole("link", { name: "Teams & Roster" });
    const teamsUrl = new URL(await teamsLink.getAttribute("href")!, page.url());
    expect(teamsUrl.pathname).toBe(`/plans/${planId}/teams`);
    expect(teamsUrl.hash).toBe(seededPlanHash);
    await teamsLink.click();
    await page.getByRole("heading", { name: "Teams" }).waitFor();

    await page.goBack();
    await page.getByRole("button", { name: "Copy share link" }).waitFor();

    const assignmentsLink = page.getByRole("link", { name: "Manage Duties" });
    const assignmentsUrl = new URL(await assignmentsLink.getAttribute("href")!, page.url());
    expect(assignmentsUrl.pathname).toBe(`/plans/${planId}/assignments`);
    expect(assignmentsUrl.hash).toBe(seededPlanHash);
    await assignmentsLink.click();
    await page.getByRole("heading", { name: "Duty Assignments" }).waitFor();
    expect(new URL(page.url()).pathname).toBe(`/plans/${planId}/assignments`);

    const missingMatchUrl = new URL(`/plans/${planId}/matches/missing-match`, page.url());
    missingMatchUrl.hash = seededPlanHash;
    await page.goto(missingMatchUrl.toString(), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Match not found" }).waitFor();
    const backToFixturesLink = page.getByRole("link", { name: "Back to fixtures" });
    await expect.poll(async () => new URL(await backToFixturesLink.getAttribute("href")!, page.url()).hash, { timeout: 10000 }).toBe(seededPlanHash);
    const backToFixtures = new URL(await backToFixturesLink.getAttribute("href")!, page.url());
    expect(backToFixtures.pathname).toBe(`/plans/${planId}`);
    expect(backToFixtures.hash).toBe(seededPlanHash);
    await page.close();
  }, 90000);

  it("claims a duty from a direct shared match link and sees it in the cockpit after refresh", async () => {
    const response = await fetch(testUrl(`/api/${seededPlanId}`));
    expect(response.ok).toBe(true);
    const { blob, revision } = await response.json();
    const key = await webcrypto.subtle.importKey("jwk", {
      k: seededPlanKey,
      alg: "A128GCM",
      ext: true,
      key_ops: ["encrypt", "decrypt"],
      kty: "oct",
    }, { name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
    const plaintext = await webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      key,
      new Uint8Array(Buffer.from(blob, "base64")),
    );
    const plan = JSON.parse(new TextDecoder().decode(plaintext));
    const matchId = "match-2025-09-21-maenner-i-0";
    const slot = plan.matches[matchId].slots[0];
    slot.assignedMemberId = null;
    slot.customHelperName = null;
    slot.assignmentStatus = "OPEN";
    const encrypted = await webcrypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(12) },
      key,
      new TextEncoder().encode(JSON.stringify(plan)),
    );
    const saveResponse = await fetch(testUrl(`/api/${seededPlanId}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob: Buffer.from(encrypted).toString("base64"), expectedRevision: revision }),
    });
    expect(saveResponse.ok).toBe(true);

    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await context.addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl), { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Copy share link" }).waitFor();
    await page.getByRole("button", { name: "Calendar" }).click();
    await page.locator("[id^='calendar-']").first().waitFor();
    await page.getByRole("button", { name: "Timeline" }).click();

    await page.goto(testUrl(`/plans/${seededPlanId}/matches/${matchId}${seededPlanHash}`), { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Select member" }).waitFor();
    await page.getByRole("button", { name: "Select member" }).click();
    const dialog = page.getByRole("dialog");
    const auditDialog = async () => {
      await dialog.evaluate(async element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => undefined))));
      const { violations } = await new AxeBuilder({ page }).include("[role=\"dialog\"]").analyze();
      expect(violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) }))).toEqual([]);
    };
    await auditDialog();
    await page.emulateMedia({ colorScheme: "dark" });
    await auditDialog();
    await page.getByLabel("Member profile", { exact: true }).selectOption("member-aaron-zipp");
    expect(await page.getByLabel("Member profile", { exact: true }).inputValue()).toBe("member-aaron-zipp");

    let rejectedClaim = false;
    await page.route(`**/api/${seededPlanId}`, async (route) => {
      if (route.request().method() === "POST" && !rejectedClaim) {
        rejectedClaim = true;
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ statusCode: 409, statusMessage: "Conflict" }),
        });
      }
      else {
        await route.continue();
      }
    });
    await page.getByRole("button", { name: "Continue claim" }).click();
    await page.getByText("Could not claim duty", { exact: true }).waitFor({ timeout: 10000 });
    expect(await page.getByText("Duty claimed", { exact: true }).count()).toBe(0);
    await page.getByRole("button", { name: "Claim" }).waitFor();
    expect(rejectedClaim).toBe(true);
    await page.unroute(`**/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Claim" }).click();
    await page.getByText("Duty claimed", { exact: true }).waitFor({ timeout: 10000 });

    const cockpitLink = page.getByRole("link", { name: "Open personal cockpit" });
    const cockpitUrl = new URL(await cockpitLink.getAttribute("href")!, page.url());
    expect(cockpitUrl.pathname).toBe(`/plans/${seededPlanId}/cockpit`);
    expect(cockpitUrl.hash).toBe(seededPlanHash);
    await cockpitLink.click();
    await page.getByRole("heading", { name: "My duties" }).waitFor();
    await page.locator(`a[href*="/matches/${matchId}"]`).waitFor();
    expect(await page.getByLabel("Member profile", { exact: true }).inputValue()).toBe("member-aaron-zipp");
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "My duties" }).waitFor();
    await page.locator(`a[href*="/matches/${matchId}"]`).waitFor();
    await browser.close();
  }, 90000);

  it("migrates a legacy shared plan before schedule, claim, refresh, and cockpit use", async () => {
    const { id, keyString } = await seedLegacyPlan();
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${id}#key=${keyString}`), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Migration Club" }).waitFor();
    await page.locator("a[href*='/matches/match-1']").waitFor();

    await page.goto(testUrl("/"), { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Resume plan" }).click();
    await page.getByRole("heading", { name: "Migration Club" }).waitFor();
    await page.locator("a[href*='/matches/match-1']").waitFor();

    await page.goto(testUrl(`/plans/${id}/matches/match-1#key=${keyString}`), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Migration Team vs Visitors" }).waitFor();
    await page.getByRole("button", { name: "Select member" }).click();
    let picker = page.getByRole("dialog");
    await picker.getByLabel("Member profile", { exact: true }).selectOption("ineligible");
    await picker.getByRole("button", { name: "Continue claim" }).click();
    await page.getByText("Could not claim duty", { exact: true }).waitFor();
    expect(await page.getByText("Duty claimed", { exact: true }).count()).toBe(0);
    expect(await page.getByText("Open", { exact: true }).count()).toBe(1);

    await page.evaluate((planId) => {
      const selected = JSON.parse(localStorage.getItem("gameday-selected-member") || "{}");
      delete selected[planId];
      localStorage.setItem("gameday-selected-member", JSON.stringify(selected));
    }, id);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Migration Team vs Visitors" }).waitFor();
    await page.getByRole("button", { name: "Select member" }).click();
    picker = page.getByRole("dialog");
    await picker.getByLabel("Member profile", { exact: true }).selectOption("eligible");
    await picker.getByRole("button", { name: "Continue claim" }).click();
    await page.getByText("Duty claimed", { exact: true }).waitFor({ timeout: 10000 });

    await page.evaluate(() => history.replaceState(null, "", location.pathname + location.search));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Migration Team vs Visitors" }).waitFor();
    expect(await page.getByText("Eligible Helper", { exact: true }).count()).toBeGreaterThan(0);
    await page.getByRole("link", { name: "Open personal cockpit" }).click();
    await page.getByRole("heading", { name: "My duties" }).waitFor();
    await page.getByText("Migration Team vs Visitors").first().waitFor();
    await page.getByText("Volunteer", { exact: true }).waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "My duties" }).waitFor();
    await page.getByText("Migration Team vs Visitors").first().waitFor();
    await page.close();
  }, 90000);

  it("creates and edits teams and members through the roster page", async () => {
    const page = await createPage();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${seededPlanId}/teams${seededPlanHash}`), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Teams" }).waitFor();

    await page.getByRole("button", { name: "Create Team" }).click();
    await page.getByLabel("Team Name").fill("E2E Team");
    const createTeamSave = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await createTeamSave;
    await page.getByRole("button", { name: "E2E Team" }).click();

    await page.getByRole("button", { name: "Add Member" }).click();
    await page.getByLabel("Full Name").fill("E2E Volunteer");
    await page.getByRole("switch", { name: "Referee License" }).click();
    await page.getByRole("checkbox", { name: "E2E Team" }).check();
    const createMemberSave = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await createMemberSave;
    await page.getByText("E2E Volunteer", { exact: true }).waitFor();

    await page.getByRole("button", { name: "Edit Name" }).click();
    await page.getByLabel("Team Name").fill("E2E Renamed Team");
    const editTeamSave = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await editTeamSave;
    await page.getByText("E2E Volunteer", { exact: true }).waitFor();
    await page.getByText("E2E Volunteer", { exact: true }).click();
    await page.getByLabel("Full Name").fill("E2E Helper");
    const editMemberSave = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Save Changes" }).click();
    await editMemberSave;

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "E2E Renamed Team" }).click();
    await page.getByText("E2E Helper", { exact: true }).waitFor();
    await page.close();
  }, 90000);

  it("assigns a guest helper and preserves plan context when returning to the schedule", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${seededPlanId}/assignments${seededPlanHash}`), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Duty Assignments" }).waitFor();

    await page.getByText("Wischer 1", { exact: true }).first().click();
    await page.getByRole("dialog", { name: "Assign Helper to Slot" }).waitFor();
    await page.getByLabel("Or Custom Guest / Volunteer Name").fill("Browser Guest");
    const saveAssignment = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await page.getByRole("button", { name: "Confirm Assignment" }).click();
    await saveAssignment;
    await page.getByText("Browser Guest", { exact: true }).waitFor();

    await page.getByText("Wischer 1", { exact: true }).first().click();
    const assignmentDialog = page.getByRole("dialog", { name: "Assign Helper to Slot" });
    await assignmentDialog.getByRole("button", { name: "All Club Members" }).click();
    await assignmentDialog.getByText("Mustafa Gabler", { exact: true }).click();
    const reassignResponse = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/${seededPlanId}`);
    await assignmentDialog.getByRole("button", { name: "Confirm Assignment" }).click();
    await reassignResponse;
    await assignmentDialog.waitFor({ state: "hidden" });
    await page.getByText("Mustafa Gabler", { exact: true }).first().waitFor();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Duty Assignments" }).waitFor();
    await page.getByText("Mustafa Gabler", { exact: true }).first().waitFor();
    const scheduleLink = page.getByRole("link", { name: "View Schedule" });
    const scheduleUrl = new URL(await scheduleLink.getAttribute("href")!, page.url());
    expect(scheduleUrl.pathname).toBe(`/plans/${seededPlanId}`);
    expect(scheduleUrl.hash).toBe(seededPlanHash);
    await page.close();
  }, 90000);

  it("edits, saves, reloads, and recovers from a failed plan load", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await page.goto(testUrl(`/plans/${editPlanId}/setup${editPlanHash}`), { waitUntil: "domcontentloaded" });
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
    const waitForShareControl = monitorSharePage(page);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.resolve() },
    }));
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await waitForShareControl(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl));
    await page.getByRole("button", { name: "Copy share link" }).click();
    const status = page.getByRole("status").filter({ hasText: "Share link copied." });
    await status.waitFor();
    expect(await status.textContent()).toContain("copied");
    await page.close();
  }, 90000);

  it("shows a recovery message when sharing cannot copy", async () => {
    const page = await createPage();
    const waitForShareControl = monitorSharePage(page);
    await page.addInitScript(() => Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => { throw new Error("denied"); } },
    }));
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: testUrl("/") }]);
    await waitForShareControl(seededPlanUrl.startsWith("http") ? seededPlanUrl : testUrl(seededPlanUrl));
    await page.getByRole("button", { name: "Copy share link" }).click();
    const alert = page.getByRole("alert");
    await alert.waitFor();
    expect(await alert.textContent()).toContain("Could not copy");
    await page.close();
  }, 90000);
});
