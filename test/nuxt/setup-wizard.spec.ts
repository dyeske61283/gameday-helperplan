import { mountSuspended } from "@nuxt/test-utils/runtime";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";
import SetupPage from "../../app/pages/setup.vue";
import { usePlanStore } from "../../app/stores/plan";

vi.mock("@vueuse/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vueuse/core")>();
  return {
    ...actual,
    useLocalStorage: vi.fn((_key, defaultValue) => ref(defaultValue)),
  };
});

describe("setup Wizard", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("shows the 'Choose your path' step when no plan is active", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = null;
    store.currentStep = 1;

    await nextTick();

    // Check for Step 1 title or options
    expect(component.text()).toContain("Choose your setup path");
    expect(component.text()).toContain("nuLiga Integration");
    expect(component.text()).toContain("Manual Setup");
  });

  it("sets the path to 'auto' when nuLiga is selected", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = null;
    store.currentStep = 1;

    await nextTick();

    // Find the nuLiga button and click it
    const buttons = component.findAll("button");
    const nuLigaBtn = buttons.find(b => b.text().includes("nuLiga"));

    if (nuLigaBtn) {
      await nuLigaBtn.trigger("click");
      await nextTick();
      expect(store.onboardingPath).toBe("auto");
      expect(store.currentStep).toBe(2);
    }
    else {
      throw new Error("nuLiga button not found");
    }
  });

  it("shows club search in Step 2 when path is 'auto'", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = null;
    store.onboardingPath = "auto";
    store.currentStep = 2;

    await nextTick();

    expect(component.text()).toContain("Find your Club");
    // Search input should be present
    expect(component.find("input[placeholder*=\"Search\"]").exists()).toBe(true);
  });

  it("shows roster selection in Step 3 when path is 'auto'", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = {
      club: { id: "123", name: "Test Club", contactEmail: "", homepage: "", lastUpdated: 1234 },
      teams: {},
      matches: {},
      config: {
        locations: [],
        roles: [],
      },
      gamedays: {},
      id: "",
      lastUpdated: 1234,
      members: {},
      rev: 0,
      schemaVersion: 1,
      season: "",
      skills: {},
    };
    store.onboardingPath = "auto";
    store.currentStep = 3;

    await nextTick();

    expect(component.text()).toContain("Select Teams");
  });

  it("shows bulk member add in Step 4", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = {
      club: { id: "123", name: "Test Club", contactEmail: "", homepage: "", lastUpdated: 1234 },
      teams: {},
      matches: {},
      config: {
        locations: [],
        roles: [],
      },
      gamedays: {},
      id: "",
      lastUpdated: 1234,
      members: {},
      rev: 0,
      schemaVersion: 1,
      season: "",
      skills: {},
    };
    store.currentStep = 4;

    await nextTick();

    expect(component.text()).toContain("Add Members");
    expect(component.find("textarea").exists()).toBe(true);
  });
});
