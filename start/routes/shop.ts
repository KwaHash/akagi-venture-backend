import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.post('/create', 'ShopsController.create')
    Route.post('/update', 'ShopsController.update')
  })

  // GET
  Route.group(() => {
    Route.get('/list', 'ShopsController.list')
    Route.get('/detail', 'ShopsController.detail')
  }).prefix('/get')
})
  .prefix('/v1/shop')
  .middleware('auth:api')
