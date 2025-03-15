import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Admin extends BaseModel {
  @column({ isPrimary: true })
  public id: number

  @column()
  public foreign_type: number

  @column()
  public foreign_id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * 引数を受け取って当該の admin(s) を返す
   * @param object
   *   find         targetの対象value
   *   target       検索対象
   *   symbols      オペレータ
   *   page         ページ
   *   limit        取得件数
   *   order        オーダー対象カラム
   *   orderBy      オーダー順
   *   notIn        指定IDを除外
   */
  public async get(
    request: {
      find?: number | string
      target?: string
      symbols?: string
      page?: number
      limit?: number
      foreign_type?: number
      foreign_id?: number
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'a.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999

    const query = Admin
      // lint避け
      .query()
      .from('admins as a')
      .where(target, symbols, find)
      .clone()

    if (request.foreign_type) {
      query.where('a.foreign_type', Number(request.foreign_type))
    }
    if (request.foreign_id) {
      query.where('a.foreign_id', Number(request.foreign_id))
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()

    return json
  }
}
