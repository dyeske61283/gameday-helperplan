import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect, it } from "vitest";

describe("new plan setup", async () => {
  await setup({ dev: true });

  it("creates a plan and reopens its canonical schedule after reload", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: url("/") }]);
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: "Set up a new plan" }).waitFor();
    await page.getByRole("button", { name: "Start setup" }).click();
    await page.getByLabel("Club name").fill("Browser Club");
    await page.getByLabel("Season").fill("2026/2027");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Teams").fill("First Team");
    await page.getByLabel("Members").fill("Test Volunteer");
    await page.getByRole("button", { name: "Create plan" }).click();
    await page.getByRole("heading", { name: "Browser Club" }).waitFor();
    const shareUrl = await page.getByLabel("Share link").inputValue();
    expect(new URL(shareUrl).pathname).toMatch(/^\/plans\/[^/]+$/);
    expect(new URL(shareUrl).hash).toMatch(/^#key=[\w-]+$/);

    const freshPage = await createPage();
    await freshPage.context().addCookies([{ name: "i18n_redirected", value: "en", url: url("/") }]);
    await freshPage.goto(shareUrl, { waitUntil: "domcontentloaded" });
    await freshPage.getByRole("heading", { name: "Browser Club" }).waitFor();
    await freshPage.close();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Browser Club" }).waitFor();
    await page.close();
  }, 90000);

  it("can cancel setup and reports validation errors", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: url("/") }]);
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: "Set up a new plan" }).waitFor();
    await page.getByRole("button", { name: "Start setup" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    const alert = page.getByRole("alert");
    await alert.waitFor();
    expect(await alert.textContent()).toContain("Enter a club name");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForURL(url("/"));
    await page.close();
  });

  it("shows a save failure without leaving setup", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: url("/") }]);
    await page.route("**/api/**", async route => route.fulfill({ status: 500, body: "save failed" }));
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Set up a new plan" }).waitFor();
    await page.getByRole("button", { name: "Start setup" }).click();
    await page.getByLabel("Club name").fill("Failure Club");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Create plan" }).click();
    await page.getByRole("alert").waitFor();
    await page.getByRole("heading", { name: "Set up a new plan" }).waitFor();
    await page.close();
  }, 90000);
});
