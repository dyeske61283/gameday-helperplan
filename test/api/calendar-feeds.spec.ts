import { $fetch, fetch, setup } from "@nuxt/test-utils/e2e";
import { describe, expect, it, vi } from "vitest";
import { useEncryption } from "../../app/composables/use-crypto";
import { parseSeasonPlan } from "../../app/utils/plan-types";
import env from "../../utils/env";
import examplePlan from "../fixtures/plan-2025-2026.json";

vi.stubEnv("NUXT_CALENDAR_FEED_SECRET", "test-secret-with-at-least-32-characters");
await setup({ host: env.TEST_HOST, dev: true });

async function savePlan() {
  const plan = parseSeasonPlan(structuredClone(examplePlan));
  plan.id = globalThis.crypto.randomUUID();
  const key = await useEncryption().generateKey();
  const blob = await useEncryption().encryptData(JSON.stringify(plan), key);
  await $fetch(`/api/${plan.id}`, { method: "POST", body: { blob, expectedRevision: 0 } });
  return { plan, key };
}

async function issueFeed(planId: string, planKey: string, scope: "matches" | "member-duties", memberId?: string) {
  return $fetch<{ feedUrl: string; expiresAt: number }>("/api/calendar-feeds", {
    method: "POST",
    body: { planId, planKey, scope, ...(memberId ? { memberId } : {}) },
  });
}

describe("calendar feeds", () => {
  it("serves every match without assignments and does not cache the feed", async () => {
    const { plan, key } = await savePlan();
    const { feedUrl } = await issueFeed(plan.id, key, "matches");
    expect(feedUrl).not.toContain(key);
    const response = await fetch(feedUrl);
    const ics = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/calendar");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(Object.keys(plan.matches).length);
    expect(ics).not.toContain("Duty:");
    expect(ics).toContain(`UID:match-${Object.values(plan.matches)[0]!.id}@gameday-helperplan`);
  });

  it("serves only the selected member's match and gameday duties", async () => {
    const { plan, key } = await savePlan();
    const assignedMemberId = "member-nelly-walton";
    const { feedUrl } = await issueFeed(plan.id, key, "member-duties", assignedMemberId);
    expect(feedUrl).not.toContain(key);
    const response = await fetch(feedUrl);
    const ics = await response.text();
    const expected = [
      ...Object.values(plan.matches).flatMap(match => match.slots.filter(slot => slot.assignedMemberId === assignedMemberId)),
      ...Object.values(plan.gamedays).flatMap(day => day.slots.filter(slot => slot.assignedMemberId === assignedMemberId)),
    ];

    expect(Object.values(plan.matches).some(match => match.slots.some(slot => slot.assignedMemberId === assignedMemberId))).toBe(true);
    expect(Object.values(plan.gamedays).some(day => day.slots.some(slot => slot.assignedMemberId === assignedMemberId))).toBe(true);
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(expected.length);
    expect(ics).toContain(`UID:duty-${assignedMemberId}-`);
    expect(ics).toContain(`UID:duty-${assignedMemberId}-gd-`);
    expect(ics).not.toContain(key);
    for (const memberId of Object.keys(plan.members).filter(id => id !== assignedMemberId))
      expect(ics).not.toContain(`UID:duty-${memberId}-`);
  });

  it("reads the latest plan and publishes moved and cancelled events with stable IDs", async () => {
    const { plan, key } = await savePlan();
    const match = Object.values(plan.matches)[0]!;
    const { feedUrl } = await issueFeed(plan.id, key, "matches");
    const original = await (await fetch(feedUrl)).text();
    match.time = new Date("2027-01-01T12:34:00.000Z");
    match.status = "CANCELLED";
    const nextBlob = await useEncryption().encryptData(JSON.stringify(plan), key);
    await $fetch(`/api/${plan.id}`, { method: "POST", body: { blob: nextBlob, expectedRevision: 1 } });
    const updated = await (await fetch(feedUrl)).text();

    expect(original).toContain(`UID:match-${match.id}@gameday-helperplan`);
    expect(updated).toContain(`UID:match-${match.id}@gameday-helperplan`);
    expect(updated).toContain("DTSTART:20270101T123400Z");
    expect(updated).toContain("STATUS:CANCELLED");
  });

  it("returns a valid empty calendar for a plan with no matches", async () => {
    const { plan, key } = await savePlan();
    plan.matches = {};
    plan.gamedays = {};
    const blob = await useEncryption().encryptData(JSON.stringify(plan), key);
    await $fetch(`/api/${plan.id}`, { method: "POST", body: { blob, expectedRevision: 1 } });
    const { feedUrl } = await issueFeed(plan.id, key, "matches");
    const response = await fetch(feedUrl);
    const ics = await response.text();

    expect(response.status).toBe(200);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it.each(["invalid schema", "decryption failure"]) ("hides invalid stored plan data after %s", async (failure) => {
    const { plan, key } = await savePlan();
    const { feedUrl } = await issueFeed(plan.id, key, "matches");
    const marker = "private-invalid-plan-marker";
    const invalidPlaintext = JSON.stringify({ marker, title: plan.club.name });
    const invalidKey = failure === "decryption failure" ? await useEncryption().generateKey() : key;
    const invalidBlob = await useEncryption().encryptData(invalidPlaintext, invalidKey);
    await $fetch(`/api/${plan.id}`, { method: "POST", body: { blob: invalidBlob, expectedRevision: 1 } });

    const response = await fetch(feedUrl);
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toContain("Calendar feed not found");
    expect(body).not.toContain(marker);
    expect(body).not.toContain(plan.club.name);
  });

  it("rejects invalid scopes and malformed or expired tokens", async () => {
    const { plan, key } = await savePlan();
    await expect($fetch("/api/calendar-feeds", {
      method: "POST",
      body: { planId: plan.id, planKey: key, scope: "everything" },
    })).rejects.toMatchObject({ status: 400 });
    await expect($fetch("/api/calendar-feeds", {
      method: "POST",
      body: { planId: plan.id, planKey: key, scope: "member-duties" },
    })).rejects.toMatchObject({ status: 400 });
    const malformed = await fetch("/api/calendar-feeds/not-a-token");
    expect(malformed.status).toBe(404);
  });
});
