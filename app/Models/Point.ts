import { DateTime } from 'luxon'
// import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { BaseModel, belongsTo, BelongsTo, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
import LineUser from 'App/Models/LineUser'
import Shop from 'App/Models/Shop'

export default class Point extends BaseModel {
  public static table = 'points'

  // // relationships
  @hasOne(() => LineUser, {
    foreignKey: 'id',
    localKey: 'line_user_id',
  })
  public lineUser: HasOne<typeof LineUser>

  @belongsTo(() => Shop, {
    foreignKey: 'shop_id',
    localKey: 'id',
  })
  public shop: BelongsTo<typeof Shop>

  // column list
  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number | null

  @column()
  public type: number | null

  @column()
  public line_user_id: number | null

  @column()
  public amount: number | null

  @column()
  public activatekey: string | null

  @column.dateTime()
  public expire: DateTime | null

  @column()
  public is_processed: number | null

  @column()
  public is_expired: number | null

  @column()
  public is_ec: number | null

  @column()
  public shop_id: number | null

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  /**
   * 引数を受け取って当該の point(s) を返す
   * @param object
   *   find         targetの対象value
   *   target       検索対象
   *   symbols      オペレータ
   *   page         ページ
   *   limit        取得件数
   *   order        オーダー対象カラム
   *   orderBy      オーダー順
   *   notIn        指定IDを除外
   *   activatekey  対象キー
   */
  public async get(
    request: {
      find?: number | string
      target?: string
      symbols?: string
      page?: number
      limit?: number
      activatekey?: string
      flags?: Array<number>
      line_user_id?: number
      processedStatus?: number
      withLineUser?: number
      withShop?: number
      withExpired?: number
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'p.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const activatekey: string | null = request.activatekey || null
    const flags: Array<number> = request.flags || [1]
    const lineUserId: number = request.line_user_id || 0
    const withLineUser: number = request.withLineUser || 0
    const withShop: number = request.withShop || 0
    const withExpired: number = request.withExpired || 0

    // 0 => is_prosecced = 1,0 (両方)
    // 1 => is_prosecced = 1 (処理済)
    // 2 => is_prosecced = 0 (未処理)
    const processedStatus: number = request.processedStatus || 0

    const query = Point
      // lint避け
      .query()
      .from('points as p')
      .where(target, symbols, find)
      .clone()

    if (activatekey) {
      query.where('activatekey', activatekey)
    }

    if (flags.length) {
      query.whereIn('flag', flags)
    }

    if (lineUserId) {
      query.where('line_user_id', lineUserId)
    }
    if (withLineUser) {
      query.preload('lineUser', (builder) => {
        builder.preload('ecUser')
      })
    }

    if (withShop) {
      query.preload('shop')
    }

    if (processedStatus) {
      if (processedStatus === 1) query.where('is_processed', 1)
      if (processedStatus === 2) query.where('is_processed', 0)
    }

    if (!withExpired) {
      query.where('is_expired', 0)
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
      activatekey?: string
      withLineUser?: number
      withShop?: number
      flags?: Array<number>
    } = {}
  ) {
    interface Args {
      id?: number
      find?: number
      symbols?: string
      activatekey?: string
      withLineUser?: number
      withShop?: number
      flags?: Array<number>
    }
    let args: Args = {}
    // idで絞り込み
    if (request.id) args = { find: Number(request.id), symbols: '=' }
    // activatekeyで絞り込み
    else if (request.activatekey) args = { activatekey: request.activatekey }
    if (request.withLineUser) args.withLineUser = request.withLineUser
    if (request.withShop) args.withShop = request.withShop
    if (request.flags) args.flags = request.flags

    const rows = await this.get(args)
    return Array.isArray(rows.data) && rows.data.length ? rows.data[0] : null
  }
}
