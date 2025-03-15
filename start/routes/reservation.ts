import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'ReservationsController.create')
    Route.post('/recreate', 'ReservationsController.recreate')
    Route.post('/delete', 'ReservationsController.delete')
  })

  // GET
  Route.group(() => {
    Route.get('/list', 'ReservationsController.list')
    Route.get('/empty', 'ReservationsController.empty')
  }).prefix('/get')
})
  .prefix('/v1/reservation')
  .middleware('auth:api')
