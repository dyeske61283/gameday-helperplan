import { writeFile } from "node:fs";
import { resolve } from "node:path";
import seasonPlan from "../test/fixtures/plan-2024-2025.json" with { type: "json" };

function fixFixtures() {
  writeFile(resolve("./test/fixtures/plan-2024-2025.json"), JSON.stringify(seasonPlan, null, 2), (err) => {
    if (err)
      throw err;
    console.log("Fixture fixed");
  });
}

fixFixtures();
