import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'IrregularReservationsController.create')
    Route.post('/delete', 'IrregularReservationsController.delete')
  })

  // GET
  Route.group(() => {
    Route.get('/list', 'IrregularReservationsController.list')
    Route.get('/empty', 'IrregularReservationsController.empty')
  }).prefix('/get')
})
  .prefix('/v1/irregularReservation')
  .middleware('auth:api')
