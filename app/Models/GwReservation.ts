import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
// import { BaseModel, column, hasOne, HasOne } from '@ioc:Adonis/Lucid/Orm'
// import User from 'App/Models/User'

export default class GwReservation extends BaseModel {
  public static table = 'gwReservations'

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
  public reservation_date: Date

  @column()
  public num_adult: number

  @column()
  public num_jr: number

  @column()
  public num_kids: number

  @column()
  public tel: string

  @column()
  public linename: string

  @column()
  public course: number

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  /**
   * 引数を受け取って当該の gwReservation(s) を返す
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
      reservation_date?: string | null
      line_user_id?: number
      course?: number
      flags?: number[]
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'r.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const reservationDate: string | null = request.reservation_date || null
    const lineUserId: number = request.line_user_id || 0
    const course: number = request.course || 0

    const query = GwReservation
      // lint避け
      .query()
      .from('gwReservations as r')
      .where(target, symbols, find)
      .clone()

    // whereもチェインできない
    query.where('r.flag', 1)

    if (lineUserId) {
      query.where('r.line_user_id', lineUserId)
    }

    if (course) {
      query.where('r.course', course)
    }

    // 予約日で絞り込み
    if (reservationDate) {
      query.where('r.reservation_date', reservationDate)
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
