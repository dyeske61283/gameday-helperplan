import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

describe("new plan setup", async () => {
  await setup({ dev: true });

  it("creates, encrypts, opens, and reloads a plan", async () => {
    const page = await createPage();
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Start Setup" }).waitFor();
    await page.getByRole("button", { name: "Start Setup" }).click();
    await page.getByRole("heading", { name: "Club Information" }).waitFor();
    await page.locator("input").nth(0).fill("TSV Browser Test");
    await page.locator("input").nth(1).fill("2026/2027");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.locator("textarea").nth(0).fill("Men 1");
    await page.getByRole("button", { name: "Continue to Members" }).click();
    await page.locator("textarea").nth(0).fill("Max Mustermann");
    await page.getByRole("button", { name: "Add Members & Finish" }).click();

    await page.getByRole("heading", { name: "Plan ready" }).waitFor();
    const shareUrl = await page.getByRole("textbox", { name: "Share link" }).inputValue();
    expect(new URL(shareUrl).hash).toMatch(/^#key=[\w-]+$/);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy share link" }).click();
    await page.getByRole("status").getByText("Share link copied.").waitFor();
    const resume = await page.evaluate(() => JSON.parse(localStorage.getItem("gameday-plan-resume") || "null"));
    expect(resume).toMatchObject({ id: new URL(shareUrl).pathname.split("/").pop(), key: expect.any(String) });
    const freshPage = await createPage();
    await freshPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await freshPage.getByRole("heading", { name: "TSV Browser Test" }).waitFor();
    expect(new URL(freshPage.url()).pathname).toBe(new URL(shareUrl).pathname);
    await freshPage.close();
    await page.close();
  }, 90000);
});
