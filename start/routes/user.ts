import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/', 'UsersController.create')
    Route.post('/password', 'UsersController.createPassword')
  })
    .prefix('/create')
    .middleware('auth:api')

  Route.group(() => {
    Route.post('/update', 'UsersController.update')
    Route.post('/forgotPassword', 'UsersController.forgotPassword')
    Route.post('/resetPassword', 'UsersController.resetPassword')
  }).middleware('auth:api')

  Route.group(() => {
    Route.get('/list', 'UsersController.list')
    Route.get('/detail', 'UsersController.detail')
  })
    .prefix('/get')
    .middleware('auth:api')
}).prefix('/v1/user')
