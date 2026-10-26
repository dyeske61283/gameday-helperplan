/* eslint-disable test/no-import-node-test -- Keep process-boundary tests on Node's standard library only. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = mkdtempSync(resolve(tmpdir(), "plan-runner-test-"));
const plan = JSON.parse(readFileSync(resolve(root, "test/fixtures/legacy-plan-v1.json"), "utf8"));
const requestPath = resolve(temp, "request.json");

after(() => rmSync(temp, { recursive: true, force: true }));

function run(input, { file = false } = {}) {
  const args = ["run", "--unstable-sloppy-imports", "--allow-read", "scripts/plan-runner.ts"];
  if (file) {
    writeFileSync(requestPath, JSON.stringify(input));
    args.push(requestPath);
  }
  return spawnSync("deno", args, { cwd: root, input: file ? undefined : input, encoding: "utf8" });
}

function parseStderr(result) {
  return JSON.parse(result.stderr);
}

test("stdin validation returns compact machine JSON", () => {
  const result = run(JSON.stringify({ command: "validate", plan }));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    command: "validate",
    summary: { valid: true, planId: plan.id, schemaVersion: 2 },
  });
});

test("file mutation returns only the compact summary", () => {
  const result = run({
    command: "claim-duty",
    plan,
    matchId: "match-1",
    slotId: "match-slot-open",
    memberId: "eligible",
    now: "2026-10-25T12:00:00.000Z",
  }, { file: true });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.deepEqual(JSON.parse(result.stdout), {
    command: "claim-duty",
    summary: { matchId: "match-1", slotId: "match-slot-open", assignedMemberId: "eligible" },
  });
});

test("malformed JSON writes a stable error to stderr and exits nonzero", () => {
  const result = run("{");

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(parseStderr(result), { error: { code: "MALFORMED_JSON", message: "Invalid JSON input" } });
});

test("unknown commands have a stable stderr error shape", () => {
  const result = run(JSON.stringify({ command: "explode", plan }));

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(parseStderr(result), { error: { code: "UNKNOWN_COMMAND", message: "Unknown command: explode" } });
});

test("rejected commands have a stable stderr error shape", () => {
  const result = run(JSON.stringify({
    command: "claim-duty",
    plan,
    matchId: "match-1",
    slotId: "match-slot-open",
    memberId: "ineligible",
    now: "2026-10-25T12:00:00.000Z",
  }));

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.deepEqual(parseStderr(result), {
    error: { code: "COMMAND_REJECTED", message: "This member does not have the required capability" },
  });
});
