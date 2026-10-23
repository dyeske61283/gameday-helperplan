type JsonObject = { [key: string]: JsonValue };
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
type Candidate = { present: true; value: JsonValue } | { present: false };

export type PlanMergeConflict = {
  path: string[];
  base: Candidate;
  local: Candidate;
  remote: Candidate;
};

export type PlanMergeResult<T> = {
  merged: T;
  conflicts: PlanMergeConflict[];
  canSave: boolean;
};

type PresentValue = Candidate;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function equal(left: unknown, right: unknown): boolean {
  if (left === right)
    return true;
  if (Array.isArray(left) && Array.isArray(right))
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    return leftKeys.length === Object.keys(right).length
      && leftKeys.every(key => Object.hasOwn(right, key) && equal(left[key], right[key]));
  }
  return false;
}

function same(left: PresentValue, right: PresentValue): boolean {
  return left.present === right.present && (!left.present || (right.present && equal(left.value, right.value)));
}

function copy(value: PresentValue): PresentValue {
  return value.present ? { present: true, value: structuredClone(value.value) } : { present: false };
}

function candidate(value: PresentValue): Candidate {
  return copy(value);
}

function mergeValue(base: PresentValue, local: PresentValue, remote: PresentValue, path: string[], conflicts: PlanMergeConflict[]): PresentValue {
  if (same(local, base))
    return copy(remote);
  if (same(remote, base) || same(local, remote))
    return copy(local);

  if (base.present && local.present && remote.present
    && isObject(base.value) && isObject(local.value) && isObject(remote.value)) {
    const keys = new Set([...Object.keys(base.value), ...Object.keys(local.value), ...Object.keys(remote.value)]);
    const entries = [...keys].flatMap((key) => {
      const merged = mergeValue(
        Object.hasOwn(base.value, key) ? { present: true, value: base.value[key]! } : { present: false },
        Object.hasOwn(local.value, key) ? { present: true, value: local.value[key]! } : { present: false },
        Object.hasOwn(remote.value, key) ? { present: true, value: remote.value[key]! } : { present: false },
        [...path, key],
        conflicts,
      );
      return merged.present ? [[key, merged.value] as const] : [];
    });
    return { present: true, value: Object.fromEntries(entries) };
  }

  conflicts.push({ path, base: candidate(base), local: candidate(local), remote: candidate(remote) });
  return copy(local);
}

/** JSON-tree prototype: objects are schema records; arrays and scalar values merge atomically. */
export function mergePlans<T extends Record<string, JsonValue>>(base: T, local: T, remote: T): PlanMergeResult<T> {
  const conflicts: PlanMergeConflict[] = [];
  const merged = mergeValue(
    { present: true, value: base },
    { present: true, value: local },
    { present: true, value: remote },
    [],
    conflicts,
  );
  if (!merged.present || !isObject(merged.value))
    throw new Error("Plan merge must produce a plan object");
  return { merged: merged.value as T, conflicts, canSave: conflicts.length === 0 };
}

export function resolveConflict<T extends Record<string, JsonValue>>(
  result: PlanMergeResult<T>,
  path: string[],
  choice: "base" | "local" | "remote",
): PlanMergeResult<T> {
  const conflict = result.conflicts.find(candidate => equal(candidate.path, path));
  if (!conflict)
    throw new Error(`No unresolved conflict at ${path.join(".")}`);
  if (!path.length)
    throw new Error("A plan-level conflict cannot be resolved by field choice");

  const selected = conflict[choice];
  const merged: unknown = structuredClone(result.merged);
  let parent = merged as JsonObject;
  for (const segment of path.slice(0, -1)) {
    if (!isObject(parent[segment]))
      throw new Error(`Cannot resolve missing parent at ${path.join(".")}`);
    parent = parent[segment] as JsonObject;
  }
  const key = path.at(-1)!;
  if (selected.present)
    parent[key] = structuredClone(selected.value);
  else
    delete parent[key];

  const conflicts = result.conflicts.filter(candidate => !equal(candidate.path, path));
  return { merged: merged as T, conflicts, canSave: conflicts.length === 0 };
}
