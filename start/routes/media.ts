import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/upload', 'MediaController.upload')
    Route.post('/update', 'MediaController.update')
    Route.post('/delete', 'MediaController.delete')
  }).middleware('auth:api')
}).prefix('/v1/media')
