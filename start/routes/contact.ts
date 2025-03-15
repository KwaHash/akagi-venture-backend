import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/send/inquiry', 'ContactsController.sendInquiry')
  })
})
  .prefix('/v1/contact')
  .middleware('auth:api')
