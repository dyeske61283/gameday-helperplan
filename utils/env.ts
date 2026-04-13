import z from "zod";
import tryParseEnv from "./try-parse-env";

const EnvSchema = z.object({
  TEST_HOST: z.url().optional(),
  DENO_DEPLOYMENT_ID: z.string().optional(),
});

export type EnvSchemaType = z.infer<typeof EnvSchema>;

// merge process.env and Deno.env (if available)
const envValues = {
  // eslint-disable-next-line node/no-process-env
  ...(typeof process !== "undefined" ? process.env : {}),
  // @ts-expect-error Deno is not defined in node types
  ...(typeof Deno !== "undefined" ? Deno.env.toObject() : {}),
};

tryParseEnv(EnvSchema, envValues);

export default EnvSchema.parse(envValues);
