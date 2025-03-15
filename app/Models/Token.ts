import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Token extends BaseModel {
  public static table = 'tokens'

  @column({ isPrimary: true })
  public id: number

  @column()
  public api_user_id: number

  @column()
  public type: number

  @column()
  public token: number

  @column()
  public is_revoked: boolean

  @column.dateTime()
  public expires_at: DateTime

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  /**
   * token取得
   * Database使ってみる
   */
  public async get(
    request: {
      where?: any
      order?: string
      orderBy?: 'asc' | 'desc' | undefined
    } = {}
  ) {
    const order: string = request.order || 'created_at'
    const orderBy: 'asc' | 'desc' | undefined = request.orderBy || 'asc'
    const data: any = await Database.query().from('tokens').orderBy(order, orderBy).clone()
    if (request.where) data.where(request.where)
    return data
  }

  /**
   * token削除
   * Lucid使ってみる
   */
  public async deletes(
    request: {
      where?: any
    } = {}
  ) {
    if (!request.where) return false
    const data = await Token.query().where(request.where).delete()
    return data
  }
}
