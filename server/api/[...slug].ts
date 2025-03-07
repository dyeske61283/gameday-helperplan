export default defineEventHandler(async (event) => {
  return 'Catch me if you can. Are you searching for anything? ' + event.context.params?.slug
})
