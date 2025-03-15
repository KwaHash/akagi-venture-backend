import Hash from '@ioc:Adonis/Core/Hash'
import { DateTime } from 'luxon'
import { BaseModel, column, beforeSave } from '@ioc:Adonis/Lucid/Orm'

export default class ApiUser extends BaseModel {
  public static table = 'apiUsers'

  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number

  @column()
  public username: string

  @column({ serializeAs: null })
  public password: string

  @beforeSave()
  public static async hashPassword(apiUser: ApiUser) {
    if (apiUser.$dirty.password) {
      apiUser.password = await Hash.make(apiUser.password)
    }
  }

  @column()
  public token: string

  @column()
  public type: string

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  public findBy: any
}
