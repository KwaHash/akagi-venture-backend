import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import Database from '@ioc:Adonis/Lucid/Database'
// import { BaseModel, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
// import User from 'App/Models/User'

export default class Shop extends BaseModel {
  public static table = 'shops'

  // // relationships
  // @hasOne(() => User, {
  //   foreignKey: 'id',
  //   localKey: 'user_id',
  // })
  // public user: HasOne<typeof User>

  // column list
  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number | null

  @column()
  public label: string | null

  @column()
  public description: string | null

  @column()
  public name: string | null

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  /**
   * 引数を受け取って当該の shop(s) を返す
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
      order?: string
      orderBy?: 'asc' | 'desc' | 'rand' | undefined
      notIn?: string
      name?: string
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 's.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const order: string = request.order || 's.created_at'
    const orderBy: 'asc' | 'desc' | 'rand' | undefined = request.orderBy || 'asc'
    const name: string | null = request.name || null

    const query = Shop
      // lint避け
      .query()
      .from('shops as s')
      .where('flag', 1)
      .where(target, symbols, find)
      .clone()

    if (name) {
      query.where('name', name)
    }

    // 並び順の指定
    if (orderBy !== 'rand') query.orderBy(order, orderBy)
    else query.orderBy(Database.raw('RAND()'))

    // 指定IDを除く
    if (request.notIn && request.notIn.length) {
      // notInは文字列で渡ってくるため配列にパース
      query.whereNotIn('s.id', JSON.parse(request.notIn))
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()

    return json
  }

  /**
   * 詳細取得
   */
  public async getDetail(
    request: {
      id?: number
      name?: string
    } = {}
  ) {
    interface Args {
      id?: number
      find?: number
      symbols?: string
      name?: string
    }
    let args: Args = {}
    // idで絞り込み
    if (request.id) args = { find: Number(request.id), symbols: '=' }
    else if (request.name) args.name = request.name

    const rows = await this.get(args)
    return Array.isArray(rows.data) && rows.data.length ? rows.data[0] : null
  }
}
