import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.get('/database', 'ConnectionsController.database')
  Route.get('/master', 'ConnectionsController.master')
})
  .prefix('/v1/connection')
  .middleware('auth:api')
