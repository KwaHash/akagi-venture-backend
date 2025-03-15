import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'GwReservationsController.create')
    Route.post('/delete', 'GwReservationsController.delete')
  })

  // GET
  Route.group(() => {
    Route.get('/empty', 'GwReservationsController.empty')
  }).prefix('/get')
})
  .prefix('/v1/gwReservation')
  .middleware('auth:api')
