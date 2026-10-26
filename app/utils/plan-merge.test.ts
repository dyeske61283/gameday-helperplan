import { describe, expect, it } from "vitest";
import legacyPlan from "../../test/fixtures/legacy-plan-v1.json";
import { mergePlans } from "./plan-merge";
import { parseSeasonPlan } from "./plan-types";

describe("mergePlans", () => {
  it("automatically combines independent edits", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.season = "2027/2028";
    remote.club.name = "Remote Club Name";

    const result = mergePlans(base, local, remote);

    expect(result.conflicts).toEqual([]);
    expect(result.plan.season).toBe("2027/2028");
    expect(result.plan.club.name).toBe("Remote Club Name");
  });

  it("retains both sides of same-field conflicts until a side is chosen", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.club.name = "Local name";
    remote.club.name = "Remote name";

    const result = mergePlans(base, local, remote);
    const remoteChoice = mergePlans(base, local, remote, "remote");

    expect(result.plan.club.name).toBe("Local name");
    expect(result.conflicts).toContainEqual({ path: "club.name", base: base.club.name, local: "Local name", remote: "Remote name" });
    expect(remoteChoice.plan.club.name).toBe("Remote name");
  });

  it("resolves different conflicting fields independently", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.club.name = "Local name";
    remote.club.name = "Remote name";
    local.season = "2027/2028";
    remote.season = "2028/2029";

    const result = mergePlans(base, local, remote, {
      "club.name": "remote",
      "season": "local",
    });

    expect(result.plan.club.name).toBe("Remote name");
    expect(result.plan.season).toBe("2027/2028");
    expect(result.conflicts.map(conflict => conflict.path)).toEqual(["club.name", "season"]);
  });

  it("merges relationship membership by ID without using array position", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const memberId = Object.keys(base.members)[0]!;
    const before = base.members[memberId]!.teamIds;
    local.members[memberId]!.teamIds = [...before, "team-local"];
    remote.members[memberId]!.teamIds = [...before, "team-remote"];

    const result = mergePlans(base, local, remote);

    expect(result.conflicts).toEqual([]);
    expect(result.plan.members[memberId]!.teamIds).toEqual([...before, "team-local", "team-remote"]);
  });

  it("merges ordered entities by stable ID rather than array position", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.config.roles.find(role => role.id === "volunteer")!.name = "Local role name";
    remote.config.roles.find(role => role.id === "timekeeper")!.name = "Remote role name";

    const result = mergePlans(base, local, remote);

    expect(result.conflicts).toEqual([]);
    expect(result.plan.config.roles.map(role => role.name)).toEqual(["Local role name", "Remote role name"]);
  });

  it("merges generated update timestamps while combining edits to one entity", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const memberId = Object.keys(base.members)[0]!;
    local.members[memberId]!.name = "Local name";
    local.members[memberId]!.updatedAt = new Date("2026-01-01T00:00:00Z");
    remote.members[memberId]!.isManual = !base.members[memberId]!.isManual;
    remote.members[memberId]!.updatedAt = new Date("2026-02-01T00:00:00Z");

    const result = mergePlans(base, local, remote);

    expect(result.conflicts).toEqual([]);
    expect(result.plan.members[memberId]!.name).toBe("Local name");
    expect(result.plan.members[memberId]!.isManual).toBe(!base.members[memberId]!.isManual);
    expect(result.plan.members[memberId]!.updatedAt).toEqual(new Date("2026-02-01T00:00:00Z"));
  });

  it("requires explicit resolution when both sides reorder the same entity collection differently", () => {
    const base = parseSeasonPlan(legacyPlan);
    base.config.roles.push({ id: "floor", name: "Floor", scope: "match" });
    const local = structuredClone(base);
    const remote = structuredClone(base);
    local.config.roles = [local.config.roles[1]!, local.config.roles[0]!, local.config.roles[2]!];
    remote.config.roles = [remote.config.roles[0]!, remote.config.roles[2]!, remote.config.roles[1]!];

    const result = mergePlans(base, local, remote);

    expect(result.conflicts.map(conflict => conflict.path)).toContain("config.roles.$order");
    expect(result.plan.config.roles.map(role => role.id)).toEqual(["timekeeper", "volunteer", "floor"]);
  });

  it("reports delete-versus-edit on stable entity IDs", () => {
    const base = parseSeasonPlan(legacyPlan);
    const local = structuredClone(base);
    const remote = structuredClone(base);
    const memberId = Object.keys(base.members)[0]!;
    delete local.members[memberId];
    remote.members[memberId]!.name = "Remote edit";

    const result = mergePlans(base, local, remote);
    const remoteChoice = mergePlans(base, local, remote, "remote");

    expect(result.conflicts[0]?.path).toBe(`members.${memberId}`);
    expect(result.plan.members[memberId]).toBeUndefined();
    expect(remoteChoice.plan.members[memberId]?.name).toBe("Remote edit");
  });
});
