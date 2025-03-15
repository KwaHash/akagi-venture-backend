import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class EcUserLineUser extends BaseModel {
  public static table = 'ecUser_lineUsers'

  @column({ isPrimary: true })
  public id: number

  @column()
  public ec_user_id: number

  @column()
  public line_user_id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
