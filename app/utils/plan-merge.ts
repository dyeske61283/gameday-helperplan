import type { SeasonPlan } from "./plan-types";

type Missing = typeof missing;
const missing = Symbol("missing");

export type PlanMergeConflict = {
  path: string;
  base: unknown;
  local: unknown;
  remote: unknown;
};

function equal(a: unknown, b: unknown): boolean {
  if (a === missing || b === missing)
    return a === b;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  return JSON.stringify(a) === JSON.stringify(b);
}

function clone<T>(value: T): T {
  return value === missing ? value : structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function relationshipArray(path: string): boolean {
  return ["teamIds", "skillIds", "matchIds"].includes(path.split(".").at(-1) ?? "");
}

function mergeRelationshipIds(base: unknown, local: unknown, remote: unknown): string[] {
  const b = new Set((base === missing ? [] : base) as string[]);
  const l = new Set((local === missing ? [] : local) as string[]);
  const r = new Set((remote === missing ? [] : remote) as string[]);
  const ids = new Set([...b, ...l, ...r]);
  const included = [...ids].filter((id) => {
    const before = b.has(id);
    const localHas = l.has(id);
    const remoteHas = r.has(id);
    return localHas === before ? remoteHas : localHas;
  });
  // These arrays are membership sets: preserve local order, then append remote-only IDs.
  return [...new Set([...(local === missing ? [] : local as string[]), ...(remote === missing ? [] : remote as string[])])]
    .filter(id => included.includes(id));
}

function orderChanged(base: string[], side: string[]): boolean {
  const baseIds = new Set(base);
  return side.filter(id => baseIds.has(id)).join("\0") !== base.filter(id => side.includes(id)).join("\0");
}

export function mergePlans(
  base: SeasonPlan,
  local: SeasonPlan,
  remote: SeasonPlan,
  preference: "local" | "remote" = "local",
): { plan: SeasonPlan; conflicts: PlanMergeConflict[] } {
  const conflicts: PlanMergeConflict[] = [];

  function conflict(path: string, b: unknown | Missing, l: unknown | Missing, r: unknown | Missing) {
    conflicts.push({
      path,
      base: b === missing ? undefined : clone(b),
      local: l === missing ? undefined : clone(l),
      remote: r === missing ? undefined : clone(r),
    });
    return clone(preference === "local" ? l : r);
  }

  function mergeValue(b: unknown | Missing, l: unknown | Missing, r: unknown | Missing, path: string): unknown | Missing {
    if (equal(l, r))
      return clone(l);
    if (["updatedAt", "lastUpdated"].includes(path.split(".").at(-1) ?? "") && l instanceof Date && r instanceof Date)
      return new Date(Math.max(l.getTime(), r.getTime()));
    if (b !== missing && (l === missing || r === missing)) {
      if (equal(l, b))
        return clone(r);
      if (equal(r, b))
        return clone(l);
      return conflict(path, b, l, r);
    }
    if (relationshipArray(path))
      return mergeRelationshipIds(b, l, r);
    if (Array.isArray(b) || Array.isArray(l) || Array.isArray(r))
      return mergeEntities(b, l, r, path);
    if (isRecord(b) || isRecord(l) || isRecord(r)) {
      if (![b, l, r].every(value => value === missing || isRecord(value)))
        return conflict(path, b, l, r);
      const before = b === missing ? {} : b as Record<string, unknown>;
      const ours = l === missing ? {} : l as Record<string, unknown>;
      const theirs = r === missing ? {} : r as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of new Set([...Object.keys(before), ...Object.keys(ours), ...Object.keys(theirs)])) {
        const value = mergeValue(before[key] ?? (Object.hasOwn(before, key) ? before[key] : missing), ours[key] ?? (Object.hasOwn(ours, key) ? ours[key] : missing), theirs[key] ?? (Object.hasOwn(theirs, key) ? theirs[key] : missing), path ? `${path}.${key}` : key);
        if (value !== missing)
          result[key] = value;
      }
      return result;
    }
    if (equal(l, b))
      return clone(r);
    if (equal(r, b))
      return clone(l);
    return conflict(path, b, l, r);
  }

  function mergeEntities(b: unknown | Missing, l: unknown | Missing, r: unknown | Missing, path: string): unknown | Missing {
    // Ordered entity arrays merge by ID; incompatible concurrent reorders are explicit conflicts.
    const before = b === missing ? [] : b;
    const ours = l === missing ? [] : l;
    const theirs = r === missing ? [] : r;
    if (![before, ours, theirs].every(value => Array.isArray(value) && value.every(item => isRecord(item) && typeof item.id === "string")))
      return conflict(path, b, l, r);

    const baseItems = before as Array<Record<string, unknown>>;
    const localItems = ours as Array<Record<string, unknown>>;
    const remoteItems = theirs as Array<Record<string, unknown>>;
    const baseById = new Map(baseItems.map(item => [item.id as string, item]));
    const localById = new Map(localItems.map(item => [item.id as string, item]));
    const remoteById = new Map(remoteItems.map(item => [item.id as string, item]));
    const ids = new Set([...baseById.keys(), ...localById.keys(), ...remoteById.keys()]);
    const mergedById = new Map<string, unknown>();
    for (const id of ids) {
      const item = mergeValue(baseById.get(id) ?? missing, localById.get(id) ?? missing, remoteById.get(id) ?? missing, `${path}[${id}]`);
      if (item !== missing)
        mergedById.set(id, item);
    }

    const baseOrder = baseItems.map(item => item.id as string);
    const localOrder = localItems.map(item => item.id as string);
    const remoteOrder = remoteItems.map(item => item.id as string);
    const localReordered = orderChanged(baseOrder, localOrder);
    const remoteReordered = orderChanged(baseOrder, remoteOrder);
    const localCommonOrder = localOrder.filter(id => baseById.has(id) && remoteById.has(id));
    const remoteCommonOrder = remoteOrder.filter(id => baseById.has(id) && localById.has(id));
    let chosenOrder = localOrder;
    if (localReordered && remoteReordered && localCommonOrder.join("\0") !== remoteCommonOrder.join("\0")) {
      conflict(`${path}.$order`, baseOrder, localOrder, remoteOrder);
      chosenOrder = preference === "local" ? localOrder : remoteOrder;
    }
    else if (!localReordered && remoteReordered) {
      chosenOrder = remoteOrder;
    }
    const order = [...new Set([...chosenOrder, ...(chosenOrder === localOrder ? remoteOrder : localOrder)])];
    return order.flatMap(id => mergedById.has(id) ? [mergedById.get(id)] : []);
  }

  return {
    plan: mergeValue(base, local, remote, "") as SeasonPlan,
    conflicts,
  };
}
