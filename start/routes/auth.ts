import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.post('/login', 'AuthController.login')
  Route.post('/check', 'AuthController.check').middleware('auth:user')
  Route.post('/logout', 'AuthController.logout').middleware('auth:user')
}).prefix('/v1/auth')
