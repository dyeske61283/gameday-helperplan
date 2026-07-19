import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrateIfNeeded, usePlanStore } from "./plan.ts";

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

  describe("migrateIfNeeded", () => {
    it("should migrate an old plan to the current version", () => {
      const oldPlan = {
        id: "old-id",
        schemaVersion: 0,
        club: { id: "1", name: "Old Club" },
        teams: {},
        matches: {
          m1: { id: "m1", homeTeam: "A", awayTeam: "B" },
        },
      };

      const migratedPlan = migrateIfNeeded(oldPlan);

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
