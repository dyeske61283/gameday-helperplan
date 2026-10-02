import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import de from "../../i18n/de.json";
import en from "../../i18n/en.json";
import {
  findHardCodedUiText,
  findHardCodedUiTextInSources,
  findMissingLocalePaths,
  findMissingReferencedLocaleKeys,
  findReferencedLocaleKeys,
} from "./locale-completeness";

describe("locale completeness", () => {
  it("keeps English and German locale shapes in sync", () => {
    expect(findMissingLocalePaths(en, de)).toEqual({
      missingFromSource: [],
      missingFromTarget: [],
    });
  });

  it("reports the exact path missing from the target locale", () => {
    expect(
      findMissingLocalePaths(
        { schedule: { title: "Schedule" } },
        { schedule: {} },
      ),
    ).toEqual({
      missingFromSource: [],
      missingFromTarget: ["schedule.title"],
    });
  });

  it("reports missing paths in both directions", () => {
    expect(
      findMissingLocalePaths(
        { schedule: { title: "Schedule" } },
        { schedule: { subtitle: "Spielplan" } },
      ),
    ).toEqual({
      missingFromSource: ["schedule.subtitle"],
      missingFromTarget: ["schedule.title"],
    });
  });

  it("compares array entries by their indexed paths", () => {
    expect(
      findMissingLocalePaths(
        { roles: [{ name: "Timekeeper" }, { name: "Secretary" }] },
        { roles: [{ name: "Zeitnehmer" }] },
      ),
    ).toEqual({
      missingFromSource: [],
      missingFromTarget: ["roles[1].name"],
    });
  });

  it("finds every literal translation key used by application source", () => {
    expect(findReferencedLocaleKeys(["t(\"common.search\")", "$t(\"nav.home\")"])).toEqual([
      "common.search",
      "nav.home",
    ]);
  });

  it("reports referenced keys that are absent from a locale", () => {
    expect(findMissingReferencedLocaleKeys(["t(\"missing.key\")"], { known: "yes" })).toEqual([
      "missing.key",
    ]);
  });

  it("reports public-facing literal text and allows dynamic bindings", () => {
    expect(findHardCodedUiText(`
      <UInput placeholder="Search members" />
      <button aria-label="Close">Close</button>
      <span>{{ member.name }}</span>
    `)).toEqual(["Search members", "Close", "line 3: Close"]);
  });

  it("keeps source paths attached to violations", () => {
    expect(findHardCodedUiTextInSources([{ path: "app/example.vue", source: "<button title=\"Close\">Close</button>" }])).toEqual([
      "app/example.vue: Close",
      "app/example.vue: line 1: Close",
    ]);
  });

  it("keeps literal translation references in application source valid", () => {
    const sources = globSync("app/**/*.{vue,ts}")
      .filter(path => !/\.(?:test|spec)\.ts$/.test(path))
      // Store errors may contain server-provided messages; pages translate their own UI fallbacks.
      .filter(path => !path.startsWith("app/stores/"))
      .map(path => readFileSync(path, "utf8"));

    expect(findMissingReferencedLocaleKeys(sources, en)).toEqual([]);
    expect(findMissingReferencedLocaleKeys(sources, de)).toEqual([]);
  });

  it("keeps public-facing application text behind locale keys", () => {
    const sources = globSync("app/**/*.{vue,ts}")
      .filter(path => !/\.(?:test|spec)\.ts$/.test(path))
      // Store errors may contain server-provided messages; pages translate their own UI fallbacks.
      .filter(path => !path.startsWith("app/stores/"))
      .map(path => ({ path, source: readFileSync(path, "utf8") }));

    expect(findHardCodedUiTextInSources(sources)).toEqual([]);
  });

  it("reports UI-facing TypeScript string literals", () => {
    expect(findHardCodedUiTextInSources([{
      path: "app/pages/example.vue",
      source: "toast.add({ title: \"Saved\", description: \"Changes synced.\" });\nuseHead({ title: \"Edit plan\" });",
    }])).toEqual([
      "app/pages/example.vue: Saved",
      "app/pages/example.vue: Changes synced.",
      "app/pages/example.vue: Edit plan",
    ]);
  });

  it("reports literal validation messages", () => {
    expect(findHardCodedUiTextInSources([{
      path: "app/pages/example.vue",
      source: "z.string().min(1, \"Required\")",
    }])).toEqual(["app/pages/example.vue: Required"]);
  });
});
