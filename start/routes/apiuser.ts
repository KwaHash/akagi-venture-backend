import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.post('/create', 'ApiUsersController.create')
}).prefix('/v1/apiuser')
