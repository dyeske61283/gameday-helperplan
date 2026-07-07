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

  it("shows the 'Set up your Gameday Plan' step when on step 1", async () => {
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

    expect(component.text()).toContain("Set up your Gameday Plan");
    expect(component.text()).toContain("Start Setup");
  });

  it("advances to step 2 when 'Start Setup' is clicked", async () => {
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

    const buttons = component.findAll("button");
    const startBtn = buttons.find(b => b.text().includes("Start Setup"));

    if (startBtn) {
      await startBtn.trigger("click");
      await nextTick();
      expect(store.currentStep).toBe(2);
    }
    else {
      throw new Error("'Start Setup' button not found");
    }
  });

  it("shows club info form in Step 2", async () => {
    const component = await mountSuspended(SetupPage, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });

    const store = usePlanStore();
    store.plan = null;
    store.currentStep = 2;

    await nextTick();

    expect(component.text()).toContain("Club Information");
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
