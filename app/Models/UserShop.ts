import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class UserShop extends BaseModel {
  public static table = 'user_shops'

  @column({ isPrimary: true })
  public id: number

  @column()
  public user_id: number

  @column()
  public shop_id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
