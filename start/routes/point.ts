import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'PointsController.create')
    Route.post('/update', 'PointsController.update')
  })

  // GET
  Route.group(() => {
    Route.get('/detail', 'PointsController.detail')
  }).prefix('/get')
})
  .prefix('/v1/point')
  .middleware('auth:api')
