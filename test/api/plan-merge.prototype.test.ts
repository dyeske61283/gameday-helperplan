import { describe, expect, it } from "vitest";
import { mergePlans, resolveConflict } from "./plan-merge.prototype";

describe("schema-aware plan merge prototype", () => {
  it("combines independent edits to one member", () => {
    const base = { members: { m1: { id: "m1", name: "Ari", teamIds: ["t1"] } } };
    const local = { members: { m1: { id: "m1", name: "Aria", teamIds: ["t1"] } } };
    const remote = { members: { m1: { id: "m1", name: "Ari", teamIds: ["t2"] } } };

    const result = mergePlans(base, local, remote);

    expect(result.merged.members.m1).toEqual({ id: "m1", name: "Aria", teamIds: ["t2"] });
    expect(result.conflicts).toEqual([]);
    expect(result.canSave).toBe(true);
  });

  it("keeps concurrent additions with distinct stable IDs", () => {
    const base = { members: {} };
    const local = { members: { m1: { id: "m1", name: "Ari" } } };
    const remote = { members: { m2: { id: "m2", name: "Bo" } } };

    const result = mergePlans(base, local, remote);

    expect(result.merged.members).toEqual({ m1: { id: "m1", name: "Ari" }, m2: { id: "m2", name: "Bo" } });
    expect(result.conflicts).toEqual([]);
    expect(result.canSave).toBe(true);
  });

  it("keeps same-field alternatives visible until a user resolves them", () => {
    const base = { members: { m1: { id: "m1", name: "Ari" } } };
    const local = { members: { m1: { id: "m1", name: "Aria" } } };
    const remote = { members: { m1: { id: "m1", name: "Ariana" } } };
    const result = mergePlans(base, local, remote);

    expect(result.canSave).toBe(false);
    expect(result.conflicts).toEqual([{
      path: ["members", "m1", "name"],
      base: { present: true, value: "Ari" },
      local: { present: true, value: "Aria" },
      remote: { present: true, value: "Ariana" },
    }]);

    const resolved = resolveConflict(result, ["members", "m1", "name"], "remote");
    expect(resolved.merged.members.m1.name).toBe("Ariana");
    expect(resolved.conflicts).toEqual([]);
    expect(resolved.canSave).toBe(true);
  });

  it("retains delete-versus-edit alternatives and requires resolution", () => {
    const base = { members: { m1: { id: "m1", name: "Ari" } } };
    const local = { members: {} };
    const remote = { members: { m1: { id: "m1", name: "Aria" } } };
    const result = mergePlans(base, local, remote);

    expect(result.merged.members).toEqual({});
    expect(result.canSave).toBe(false);
    expect(result.conflicts).toEqual([{
      path: ["members", "m1"],
      base: { present: true, value: { id: "m1", name: "Ari" } },
      local: { present: false },
      remote: { present: true, value: { id: "m1", name: "Aria" } },
    }]);

    const resolved = resolveConflict(result, ["members", "m1"], "remote");
    expect(resolved.merged.members.m1).toEqual({ id: "m1", name: "Aria" });
    expect(resolved.canSave).toBe(true);
  });
});
