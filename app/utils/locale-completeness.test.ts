import { globSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import de from "../../i18n/de.json";
import en from "../../i18n/en.json";
import {
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

  it("keeps literal translation references in application source valid", () => {
    const sources = globSync("app/**/*.{vue,ts}")
      .filter(path => !/\.(?:test|spec)\.ts$/.test(path))
      .map(path => readFileSync(path, "utf8"));

    expect(findMissingReferencedLocaleKeys(sources, en)).toEqual([]);
    expect(findMissingReferencedLocaleKeys(sources, de)).toEqual([]);
  });
});
