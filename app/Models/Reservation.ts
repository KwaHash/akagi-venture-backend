import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
// import { BaseModel, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
// import User from 'App/Models/User'

export default class Reservation extends BaseModel {
  public static table = 'reservations'

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
  public flag: number

  @column()
  public event_id: string | null

  @column()
  public line_user_id: number

  @column()
  public plan_id: number

  @column.dateTime()
  public start_time: DateTime

  @column.dateTime()
  public end_time: DateTime

  @column()
  public num_adult: number

  @column()
  public num_kids: number

  @column()
  public num_preschooler: number

  @column()
  public tel: string

  @column()
  public linename: string

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  /**
   * 引数を受け取って当該の reservation(s) を返す
   * @param object
   *   find         targetの対象value
   *   target       検索対象
   *   symbols      オペレータ
   *   page         ページ
   *   limit        取得件数
   *   order        オーダー対象カラム
   *   orderBy      オーダー順
   *   notIn        指定IDを除外
   *   between      予約・終了開始時間
   *   line_user_id LineUserId
   */
  public async get(
    request: {
      find?: number | string
      target?: string
      symbols?: string
      page?: number
      limit?: number
      between?: any
      line_user_id?: number
      flags?: number[]
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'r.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const lineUserId: number = request.line_user_id || 0
    let between
    try {
      between = JSON.parse(request.between)
    } catch (error) {
      between = request.between || [null, null]
    }

    const query = Reservation
      // lint避け
      .query()
      .from('reservations as r')
      .where(target, symbols, find)
      .clone()

    // whereもチェインできない
    query.where('r.flag', 1)

    // 登録年月日絞り込み
    if (between[0] === 'null') between[0] = null // 配列内がnullの文字列の時がある
    if (between[1] === 'null') between[1] = null
    if (between[0] || between[1]) {
      // TODO: luxonはmoment(時間データ)のように一律で読み込めず、フォーマット指定する必要があるので、送り側で合わせるか、調査が必要。
      // 現状はSQLフォーマット(YYYY-MM-DD HH:mm:ss)のみである想定
      if (between[0]) {
        query.where('r.start_time', '>=', between[0])
      }
      if (between[1]) {
        query.where('r.end_time', '<=', between[1])
      }
    }

    if (lineUserId) {
      query.where('r.line_user_id', lineUserId)
    }

    // flag絞り込み
    if (request.flags && request.flags.length) {
      query.whereIn('r.flag', request.flags)
    } else {
      query.whereIn('r.flag', [1])
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()

    return json
  }
}
