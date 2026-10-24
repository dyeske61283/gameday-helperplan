import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { AxeBuilder } from "@axe-core/playwright";
import { setup, url } from "@nuxt/test-utils/e2e";
import { chromium } from "playwright";
import { beforeAll, describe, expect, it } from "vitest";
/* eslint-disable node/no-process-env */

const planId = "f530083d-8c74-4f10-931a-dd877ee7b52c";
const planKey = "tWVZ4hmOA7LFsrNViX1X6w";
const pathname = `/plans/${planId}/location-link-prototype`;

describe("location link options prototype", async () => {
  await setup({ host: process.env.TEST_HOST, dev: true });

  beforeAll(async () => {
    const plan = JSON.parse(await readFile("test/fixtures/plan-2025-2026.json", "utf8"));
    plan.config.locations[0].link = "https://venue.example/location?x=1";
    const linkedLocation = plan.config.locations[0];
    plan.config.locations = [linkedLocation, { id: "no-link-hall", name: "Plain-text Hall" }];
    const gamedays = Object.values(plan.gamedays).filter(item => item.locationId === linkedLocation.id).slice(0, 2);
    plan.gamedays = Object.fromEntries(gamedays.map(gameday => [gameday.id, gameday]));
    const matchIds = new Set(gamedays.flatMap(gameday => gameday.matchIds));
    plan.matches = Object.fromEntries([...matchIds].map(matchId => [matchId, plan.matches[matchId]]));
    const key = await webcrypto.subtle.importKey("jwk", {
      k: planKey,
      alg: "A128GCM",
      ext: true,
      key_ops: ["encrypt", "decrypt"],
      kty: "oct",
    }, { name: "AES-GCM", length: 128 }, false, ["encrypt"]);
    const encrypted = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(12) }, key, new TextEncoder().encode(JSON.stringify(plan)));
    const existing = await fetch(url(`/api/${planId}`));
    const expectedRevision = existing.ok ? (await existing.json()).revision ?? 0 : 0;
    const response = await fetch(url(`/api/${planId}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blob: Buffer.from(encrypted).toString("base64"), expectedRevision }),
    });
    expect(response.ok).toBe(true);
  });

  it("keeps both patterns accessible and functional on mobile and desktop", async () => {
    const browser = await chromium.launch();
    const context = await browser.newContext({ locale: "en-US", viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    try {
      let copiedLink = "";
      await page.exposeFunction("recordClipboardText", (text: string) => {
        copiedLink = text;
      });
      await page.goto(url(`${pathname}#key=${planKey}`), { waitUntil: "domcontentloaded" });

      const location = page.getByRole("article").filter({ hasText: "Aalen, Seebach-Arena" });
      await location.waitFor();
      expect(await location.isVisible()).toBe(true);
      const plainLocation = page.getByRole("article").filter({ hasText: "Plain-text Hall" });
      await plainLocation.waitFor();
      expect(await plainLocation.getByRole("button").count()).toBe(0);
      expect(await plainLocation.getByRole("link").count()).toBe(0);
      for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.evaluate(() => {
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: (text: string) => (window as any).recordClipboardText(text) },
          });
        });
        await location.getByRole("button", { name: "Open dialog actions for Aalen, Seebach-Arena" }).click();
        const dialog = page.getByRole("dialog", { name: "Aalen, Seebach-Arena" });
        await dialog.waitFor();
        expect(await dialog.isVisible()).toBe(true);
        expect((await new AxeBuilder({ page }).exclude("nuxt-devtools-frame").analyze()).violations).toEqual([]);
        await dialog.getByRole("button", { name: "Copy link" }).click();
        expect(copiedLink).toBe("https://venue.example/location?x=1");
        expect(await dialog.getByRole("status").textContent()).toBe("Link copied.");
        const dialogLink = dialog.getByRole("link", { name: "Open link (opens in a new tab)" });
        expect(await dialogLink.getAttribute("target")).toBe("_blank");
        expect(await dialogLink.getAttribute("rel")).toBe("noopener noreferrer");
        await dialog.getByRole("button", { name: "Close" }).click();

        await location.getByRole("button", { name: "Show actions for Aalen, Seebach-Arena" }).click();
        const menu = location.getByRole("group", { name: "Actions for Aalen, Seebach-Arena" });
        await menu.waitFor();
        expect(await menu.isVisible()).toBe(true);
        expect((await new AxeBuilder({ page }).exclude("nuxt-devtools-frame").analyze()).violations).toEqual([]);
        await menu.getByRole("button", { name: "Copy link" }).click();
        expect(await location.getByRole("status").textContent()).toBe("Link copied.");
        await page.evaluate(() => {
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: { writeText: async () => { throw new Error("clipboard unavailable"); } },
          });
        });
        await menu.getByRole("button", { name: "Copy link" }).click();
        expect(await location.getByRole("status").textContent()).toBe("Could not copy link.");
        const menuLink = menu.getByRole("link", { name: "Open link (opens in a new tab)" });
        expect(await menuLink.getAttribute("href")).toBe("https://venue.example/location?x=1");
        expect(await menuLink.getAttribute("target")).toBe("_blank");
        expect(await menuLink.getAttribute("rel")).toBe("noopener noreferrer");
        await location.getByRole("button", { name: "Show actions for Aalen, Seebach-Arena" }).click();
      }

      await page.setViewportSize({ width: 1280, height: 800 });
      await page.evaluate((path) => {
        window.history.pushState({}, "", path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, `/plans/${planId}#key=${planKey}`);
      const card = page.locator("#gameday-gameday-2025-09-21-seebachgrundhalle");
      await card.waitFor();
      const dialogIds = await page.locator("dialog[id^='location-dialog-']").evaluateAll(dialogs => dialogs.map(dialog => dialog.id));
      expect(dialogIds.length).toBeGreaterThan(0);
      expect(new Set(dialogIds).size).toBe(dialogIds.length);
      const trigger = card.getByRole("button", { name: "Open dialog actions for Aalen, Seebach-Arena" });
      await trigger.waitFor();
      await trigger.click();

      const dialog = page.getByRole("dialog", { name: "Aalen, Seebach-Arena" });
      await dialog.waitFor();
      expect(new URL(page.url()).pathname).toBe(`/plans/${planId}`);
      const box = await dialog.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.abs(box!.x + box!.width / 2 - 640)).toBeLessThan(2);
      expect(Math.abs(box!.y + box!.height / 2 - 400)).toBeLessThan(2);
      expect((await new AxeBuilder({ page }).include("dialog").analyze()).violations).toEqual([]);

      const openLink = dialog.getByRole("link", { name: "Open link (opens in a new tab)" });
      expect(await openLink.getAttribute("href")).toBe("https://venue.example/location?x=1");
      expect(await openLink.getAttribute("target")).toBe("_blank");
      expect(await openLink.getAttribute("rel")).toBe("noopener noreferrer");
      expect(await openLink.getAttribute("class")).toContain("bg-primary");
      expect(await openLink.locator("[class~=\"i-lucide:external-link\"]").count()).toBe(1);

      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: { writeText: (text: string) => (window as any).recordClipboardText(text) },
        });
      });
      const copyButton = dialog.getByRole("button", { name: "Copy link" });
      await copyButton.click();
      expect(copiedLink).toBe("https://venue.example/location?x=1");
      expect(await dialog.getByRole("button", { name: "Copied" }).textContent()).toContain("Copied");
      expect(await dialog.getByRole("status").textContent()).toBe("Link copied.");
    }
    finally {
      await context.close();
      await browser.close();
    }
  });
});
