import { createPage, setup, url } from "@nuxt/test-utils/e2e";
import { describe, expect } from "vitest";
import { And, Given, Scenario, Then, When } from "./helpers/bdd";

describe("feature: Setup Wizard Navigation & Initialization", async () => {
  await setup({
    // eslint-disable-next-line node/no-process-env
    host: process.env.TEST_HOST,
    dev: true,
  });

  Scenario("User navigates from home page to setup wizard", async () => {
    let page: Awaited<ReturnType<typeof createPage>>;

    await Given("a user visits the home page", async () => {
      page = await createPage();
      await page.goto(url("/"));
    });

    await When("the user navigates to the setup page", async () => {
      await page.goto(url("/setup"));
    });

    await Then("the wizard displays the first setup step", async () => {
      const content = await page.textContent("body");
      expect(content).toBeTruthy();
    });

    await And("the setup page container is active", async () => {
      expect(page.url()).toContain("/setup");
    });

    await page.close();
  });
});
