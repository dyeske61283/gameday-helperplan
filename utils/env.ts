import z from "zod";
import tryParseEnv from "./try-parse-env";

const EnvSchema = z.object({
  TEST_HOST: z.url().optional(),
  DENO_DEPLOYMENT_ID: z.string().optional(),
});

export type EnvSchemaType = z.infer<typeof EnvSchema>;

tryParseEnv(EnvSchema);

// disable lint error here, in order to make sure
// this is the only location where we read process.env
// eslint-disable-next-line node/no-process-env
export default EnvSchema.parse(process.env);
