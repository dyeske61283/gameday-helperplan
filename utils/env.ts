/* eslint-disable node/no-process-env */
import process from "node:process";
import { z, ZodError } from "zod";

const EnvSchema = z.object({
  TEST_HOST: z.url().optional(),
  DENO_DEPLOYMENT_ID: z.string().optional(),
});

export type EnvSchemaType = z.infer<typeof EnvSchema>;

try {
  EnvSchema.parse(process.env);
}
catch (error) {
  if (error instanceof ZodError) {
    const missing = error.issues.map(i => i.path[0]?.toString()).join("\n");
    const e = new Error(`Missing required values in .env:\n${missing}`);
    e.stack = "";
    throw e;
  }
  else {
    console.error(error);
  }
}

export default EnvSchema.parse(process.env);
