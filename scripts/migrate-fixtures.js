import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function migratePlan(plan) {
  for (const match of Object.values(plan.matches ?? {})) {
    for (const slot of match.slots ?? []) {
      slot.assignmentStatus = slot.assignmentStatus
        ?? (slot.assignedMemberId || slot.customHelperName ? "ASSIGNED" : "OPEN");
    }
  }
  for (const gameday of Object.values(plan.gamedays ?? {})) {
    for (const slot of gameday.slots ?? []) {
      slot.assignmentStatus = slot.assignmentStatus
        ?? (slot.assignedMemberId || slot.customHelperName ? "ASSIGNED" : "OPEN");
    }
  }
  plan.schemaVersion = 2;
  return plan;
}

for (const filename of ["plan-2024-2025.json", "plan-2025-2026.json"]) {
  const filenamePath = resolve(`./test/fixtures/${filename}`);
  const migrated = migratePlan(JSON.parse(readFileSync(filenamePath, "utf8")));
  writeFileSync(filenamePath, JSON.stringify(migrated, null, 2));
}
