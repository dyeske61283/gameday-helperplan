import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlanStore } from "./plan.ts";

// Mock dependencies
vi.mock("../composables/use-crypto", () => ({
  useEncryption: () => ({
    encryptData: vi.fn(),
    generateKey: vi.fn(),
  }),
  useDecryption: () => ({
    decryptBlob: vi.fn(),
  }),
}));

vi.mock("@vueuse/core", () => ({
  useLocalStorage: (_: string, defaultValue: any) => ({
    value: defaultValue,
  }),
}));

describe("usePlanStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("importTeams", () => {
    it("should import teams from nuLiga data", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      const nuLigaTeams = [
        { teamId: "12345", teamName: "Männer 1", leagueName: "Landesliga" },
        { teamId: "67890", teamName: "Frauen 1", leagueName: "Oberliga" },
      ];

      store.importTeams(nuLigaTeams);

      expect(store.plan?.teams["12345"]).toBeDefined();
      expect(store.plan?.teams["12345"]?.name).toBe("Männer 1 (Landesliga)");
      expect(store.plan?.teams["12345"]?.isManual).toBe(false);

      expect(store.plan?.teams["67890"]).toBeDefined();
      expect(store.plan?.teams["67890"]?.name).toBe("Frauen 1 (Oberliga)");
    });
  });

  describe("importClub", () => {
    it("should import club data from nuLiga data", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      const nuLigaClub = {
        clubId: "4321",
        clubName: "TSV Handball",
        contactEmail: "info@tsv-handball.de",
        homepage: "https://tsv-handball.de",
      };

      store.importClub(nuLigaClub);

      expect(store.plan?.club.id).toBe("4321");
      expect(store.plan?.club.name).toBe("TSV Handball");
      expect(store.plan?.club.contactEmail).toBe("info@tsv-handball.de");
      expect(store.plan?.club.homepage).toBe("https://tsv-handball.de");
    });
  });

  describe("importMatches", () => {
    it("should import matches from nuLiga data", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      const nuLigaMatches = [
        {
          meetingId: "match-1",
          scheduledTime: "2026-05-15T18:00:00Z",
          teamHomeName: "Our Club 1",
          teamGuestName: "Opponent Club 1",
        },
      ];

      store.importMatches(nuLigaMatches);

      expect(store.plan?.matches["match-1"]).toBeDefined();
      expect(store.plan?.matches["match-1"]?.homeTeam).toBe("Our Club 1");
      expect(store.plan?.matches["match-1"]?.awayTeam).toBe("Opponent Club 1");
    });
  });

  describe("migrateIfNeeded", () => {
    it("should migrate an old plan to the current version", () => {
      const store = usePlanStore();

      const oldPlan = {
        id: "old-id",
        schemaVersion: 0,
        club: { id: "1", name: "Old Club" },
        teams: {},
        matches: {
          m1: { id: "m1", homeTeam: "A", awayTeam: "B" },
        },
      };

      // @ts-expect-error - testing migration of incomplete/old data
      const migratedPlan = store.migrateIfNeeded(oldPlan);

      expect(migratedPlan.schemaVersion).toBe(1);
      expect(migratedPlan.matches.m1?.slots).toBeDefined();
      expect(Array.isArray(migratedPlan.matches.m1?.slots)).toBe(true);
    });
  });

  describe("assignHelperTeam", () => {
    it("should assign a helper team to a match", () => {
      const store = usePlanStore();
      store.createNewPlan("test-plan-id", "test-key");

      store.plan!.matches.m1 = {
        id: "m1",
        time: "18:00",
        homeTeam: "A",
        awayTeam: "B",
        slots: [],
        updatedAt: 0,
      };

      store.assignHelperTeam("m1", "t1");

      expect(store.plan?.matches.m1.helperTeamId).toBe("t1");
      expect(store.plan?.matches.m1.updatedAt).toBeGreaterThan(0);
    });
  });
});
