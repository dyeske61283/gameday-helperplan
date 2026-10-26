import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { PlanRunnerError, runPlanCommand } from "../app/utils/plan-runner.ts";

async function readStdin(): Promise<string> {
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", chunk => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1)
    throw new Error("Usage: plan-runner.ts [input.json]");
  const input = args[0] ? await readFile(args[0], "utf8") : await readStdin();
  const result = runPlanCommand(JSON.parse(input));
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
catch (error) {
  const code = error instanceof PlanRunnerError
    ? error.code
    : error instanceof SyntaxError ? "MALFORMED_JSON" : "RUNNER_ERROR";
  const message = error instanceof SyntaxError
    ? "Invalid JSON input"
    : error instanceof Error ? error.message : String(error);
  process.stderr.write(`${JSON.stringify({ error: { code, message } })}\n`);
  process.exitCode = 1;
}
