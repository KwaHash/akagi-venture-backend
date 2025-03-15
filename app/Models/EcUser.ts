import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import LineUser from 'App/Models/LineUser'

export default class EcUser extends BaseModel {
  public static table = 'ecUsers'

  /** relaionships */
  @manyToMany(() => LineUser, {
    pivotTable: 'ecUser_lineUsers',
    localKey: 'id',
    pivotForeignKey: 'ec_user_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'line_user_id',
  })
  public lineUser: ManyToMany<typeof LineUser>

  @column({ isPrimary: true })
  public id: number

  @column()
  public customer_id: number

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * 引数を受け取って当該の ecUser を返す
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
      withLineUser?: number
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'eu.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const withLineUser: number = request.withLineUser || 0

    const query = EcUser
      // lint避け
      .query()
      .from('ecUsers as eu')
      .where(target, symbols, find)
      .clone()

    if (withLineUser) {
      query.preload('lineUser')
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()

    return json
  }
}
