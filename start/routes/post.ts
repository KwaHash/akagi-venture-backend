import Route from '@ioc:Adonis/Core/Route'

Route.group(() => {
  Route.group(() => {
    Route.post('/regist', 'PostController.regist')
    Route.post('/update', 'PostController.update')
  })

  Route.group(() => {
    Route.get('/getlist', 'PostController.getlist')
    Route.get('/getdetail', 'PostController.getdetail')
  })
})
  .prefix('/v1/post')
  .middleware('auth:api')
