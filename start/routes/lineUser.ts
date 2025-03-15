import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'LineUsersController.create')
    Route.post('/update', 'LineUsersController.update')
  })

  // GET
  Route.group(() => {
    Route.get('/detail', 'LineUsersController.detail')
  }).prefix('/get')
})
  .prefix('/v1/lineUser')
  .middleware('auth:api')
