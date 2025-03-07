export default defineEventHandler(async (event) => {
  try {
    const body = await readValidatedBody(event, (body) => {
      throw new Error("Hihi, you are dumb");
    })

  }
  catch(error) {
    if (error instanceof Error) {
      return error.message;
    }
  }
  return 'Hello Nitro'
})
