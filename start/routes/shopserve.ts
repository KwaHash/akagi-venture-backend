import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  // POST
  Route.group(() => {
    Route.get('/get/items', 'ShopserveController.getItems')
  })
})
  .prefix('/v1/shopserve')
  .middleware('auth:api')
