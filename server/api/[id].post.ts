import z from "zod"

export default defineEventHandler(async (event) => {
  const { id: planId } = await getValidatedRouterParams(event, z.object({
    id: z.string().length(36)
  }).parse)
  const plan = await readValidatedBody(event, z.object({
    blob: z.string()
  }).parse)

  const storage = useStorage("plans")
  storage.set<string>(planId, plan.blob)

  return plan
})
