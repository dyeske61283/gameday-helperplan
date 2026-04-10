/* eslint-disable no-console */
import { AxeBuilder } from "@axe-core/playwright";
import { chromium } from "playwright";

async function runAudit(page, name) {
  console.log(`--- Running accessibility audit for: ${page.url()} ${name} ---`);
  const results = await new AxeBuilder({ page })
    .exclude(".nuxt-devtools-panel-content")
    .exclude("nuxt-devtools-frame")
    .analyze();

  if (results.violations.length === 0) {
    console.log(`No accessibility violations found for  ${page.url()} ${name}!`);
  }
  else {
    console.log(`Found ${results.violations.length} violations for ${page.url()} ${name}:`);
    results.violations.forEach((violation) => {
      console.log(`Violation: ${violation.id}`);
      console.log(`Impact: ${violation.impact}`);
      console.log(`Description: ${violation.description}`);
      violation.nodes.forEach((node) => {
        console.log(`  Selector: ${node.target}`);
        console.log(`  HTML: ${node.html}`);
      });
      console.log("-".repeat(20));
    });
  }
  return results.violations.length;
}

async function runAuditDarkAndLight(page, url, totalViolations) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(url);
  await page.waitForTimeout(2000);
  totalViolations += await runAudit(page, "Light Mode");

  // Dark mode
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(url);
  await page.waitForTimeout(2000);
  totalViolations += await runAudit(page, "Dark Mode");

  return totalViolations;
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const host = process.env.TEST_HOST || "http://localhost:3000";
  const url = host;
  let totalViolations = 0;

  try {
    totalViolations = await runAuditDarkAndLight(page, `${host}/example`, totalViolations);

    totalViolations = await runAuditDarkAndLight(page, url, totalViolations);
    // "crawl" all other pages by clicking on links
    const linksElements = (await page.getByRole("link").all());
    const links = await Promise.all(linksElements.map(async (link) => {
      const href = await link.getAttribute("href");
      return href;
    }));
    console.log(`Found ${links.length} links to audit.`);
    console.log("Auditing links...");
    const linkSet = new Set(links);
    for (const link of linkSet) {
      if (link && !link.startsWith("#") && link.startsWith("/")) {
        totalViolations = await runAuditDarkAndLight(page, host + link, totalViolations);
      }
    }
  }
  catch (error) {
    console.error("Error during audit:", error);
  }
  finally {
    await browser.close();
  }

  if (totalViolations > 0) {
    console.log(`Total violations found: ${totalViolations}`);
    process.exit(1);
  }
  else {
    console.log("All accessibility checks passed!");
    process.exit(0);
  }
})();
