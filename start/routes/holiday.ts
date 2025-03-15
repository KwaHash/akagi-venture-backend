import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'HolidaysController.create')
    Route.post('/update', 'HolidaysController.update')
  })

  // GET
  Route.group(() => {
    Route.get('/list', 'HolidaysController.list')
  }).prefix('/get')
})
  .prefix('/v1/holiday')
  .middleware('auth:api')
