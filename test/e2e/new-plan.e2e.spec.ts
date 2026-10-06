import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, it } from "vitest";

describe("new plan setup", async () => {
  await setup({ dev: true });

  it("renders the unavailable new-plan state", async () => {
    const page = await createPage();
    await page.context().addCookies([{ name: "i18n_redirected", value: "en", url: url("/") }]);
    await page.goto(url("/setup"), { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.getByRole("heading", { name: "New plan setup is not available yet." }).waitFor();
    await page.getByRole("link", { name: "Back to Home" }).waitFor();
    await page.close();
  }, 90000);
});
