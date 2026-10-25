import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import process from "node:process";
import { runPlanCommand } from "../app/utils/plan-runner.ts";

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
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
