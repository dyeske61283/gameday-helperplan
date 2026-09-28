import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, it } from "vitest";

describe("new plan setup", async () => {
  await setup({ dev: true });

  it("creates, encrypts, opens, and reloads a plan", async () => {
    const page = await createPage();
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => !!(document.querySelector("button") as any)?.__vueParentComponent, null, { timeout: 10000 });
    await page.getByRole("button", { name: "Start Setup" }).click();
    await page.locator("input").nth(0).fill("TSV Browser Test");
    await page.locator("input").nth(1).fill("2026/2027");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("textarea").nth(0).fill("Men 1");
    await page.getByRole("button", { name: "Continue to Members" }).click();
    await page.locator("textarea").nth(0).fill("Max Mustermann");
    await page.getByRole("button", { name: "Add Members & Finish" }).click();

    await page.waitForURL(/\/plans\/[0-9a-f-]+/);
    await page.getByRole("heading", { name: "TSV Browser Test" }).waitFor();
    const planUrl = page.url().split("#")[0];
    const resume = await page.evaluate(() => JSON.parse(localStorage.getItem("gameday-plan-resume") || "null"));
    await page.goto(`${planUrl}#key=${resume.key}`, { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "TSV Browser Test" }).waitFor();
    await page.close();
  }, 90000);
});
