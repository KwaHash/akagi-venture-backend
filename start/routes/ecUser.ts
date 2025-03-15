import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/link2LineUser', 'EcUsersController.link2LineUser')
  })

  // GET
  Route.group(() => {
    // Route.get('/detail', 'PointsController.detail')
  }).prefix('/get')
})
  .prefix('/v1/ecUser')
  .middleware('auth:api')
