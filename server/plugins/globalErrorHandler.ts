export default defineNitroPlugin((nitroApp) => {
  nitroApp.h3App.options.onError = (error, event) => {
    console.error('--- H3 UNCAUGHT EXCEPTION ---')
    console.error(`Route: ${event?.path}`)
    console.error(error.stack || error) // This prints the full stack trace
    console.error('-----------------------------')
  }

  nitroApp.hooks.hook('error', async (error, { event }) => {
    console.error('--- NITRO UNCAUGHT EXCEPTION ---')
    console.error(`Route: ${event?.path}`)
    console.error(error.stack || error) // This prints the full stack trace
    console.error('-------------------------------')
  })
})
