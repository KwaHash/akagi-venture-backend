/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

import './routes/connection'
import './routes/apiuser'
import './routes/media'
import './routes/user'
import './routes/auth'
import './routes/point'
import './routes/shop'
import './routes/lineUser'
import './routes/reservation'
import './routes/holiday'
import './routes/gwReservation'
import './routes/ecUser'
import './routes/contact'
import './routes/shopserve'
import './routes/irregularReservation'
import './routes/post'

Route.get('/', async () => {
  return { hello: 'world' }
})
