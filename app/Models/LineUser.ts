import { DateTime } from 'luxon'
// import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import { BaseModel, column, hasMany, HasMany, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import Point from 'App/Models/Point'
import EcUser from 'App/Models/EcUser'
import Reservation from 'App/Models/Reservation'
import GwReservation from 'App/Models/GwReservation'
import IrregularReservation from 'App/Models/IrregularReservation'
import Admin from 'App/Models/Admin'

export default class LineUser extends BaseModel {
  public static table = 'lineUsers'

  /** relaionships */
  @manyToMany(() => EcUser, {
    pivotTable: 'ecUser_lineUsers',
    localKey: 'id',
    pivotForeignKey: 'line_user_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'ec_user_id',
  })
  public ecUser: ManyToMany<typeof EcUser>

  // relationships
  @hasMany(() => Point, {
    foreignKey: 'line_user_id',
    localKey: 'id',
  })
  public point: HasMany<typeof Point>

  // relationships
  @hasMany(() => Reservation, {
    foreignKey: 'line_user_id',
    localKey: 'id',
  })
  public reservation: HasMany<typeof Reservation>

  // relationships
  @hasMany(() => GwReservation, {
    foreignKey: 'line_user_id',
    localKey: 'id',
  })
  public gwReservation: HasMany<typeof GwReservation>

  // relationships
  @hasMany(() => IrregularReservation, {
    foreignKey: 'line_user_id',
    localKey: 'id',
  })
  public irregularReservation: HasMany<typeof IrregularReservation>

  // relationships
  @hasMany(() => Admin, {
    foreignKey: 'foreign_id',
    localKey: 'id',
    onQuery(query) {
      query.where('foreign_type', 1)
    },
  })
  public admin: HasMany<typeof Admin>

  // column list
  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number | null

  @column()
  public u_id: string | null

  @column()
  public linename: string | null

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @column()
  public thumbnail: string | null

  /**
   * 引数を受け取って当該の lineUser(s) を返す
   * @param object
   *   find               targetの対象value
   *   target             検索対象
   *   symbols            オペレータ
   *   page               ページ
   *   limit              取得件数
   *   u_id               対象キー
   *   withPoints         pointsのリレーション
   *   withReservations   reservationsのリレーション
   *   isFuture           reservationsのリレーションを未来日のみに
   */
  public async get(
    request: {
      find?: number | string
      target?: string
      symbols?: string
      page?: number
      limit?: number
      u_id?: string
      hasPoints?: number
      withPoints?: number
      withReservations?: number
      isFuture?: number
      withCustomer?: number
      flags?: Array<number>
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const lineUID: string = request.u_id || ''
    const hasPoints: number = request.hasPoints || 0
    const withPoints: number = request.withPoints || 0
    const withReservations: number = request.withReservations || 0
    const isFuture: number = request.isFuture || 0
    const withCustomer: number = request.withCustomer || 0
    const flags: Array<number> = request.flags || [1]

    const query = LineUser
      // lint避け
      .query()
      .from('lineUsers')
      .where(target, symbols, find)
      .whereIn('flag', flags)
      .clone()

    query.preload('admin')

    if (lineUID) {
      query.where('u_id', lineUID)
    }

    if (hasPoints) {
      query.whereHas('point', (builder) => {
        builder.where('is_expired', 0)
        builder.where('flag', 1)
      })
    }
    if (withPoints) {
      query.preload('point', (builder) => {
        builder.where('is_expired', 0)
        builder.where('flag', 1)
        builder.preload('shop')
      })
    }

    if (withCustomer) {
      query.preload('ecUser')
    }

    if (withReservations) {
      query.preload('reservation', (builder) => {
        builder.where('flag', 1)
        if (isFuture) {
          const dt = DateTime.local()
          const formated = dt.toFormat('yyyy-MM-dd HH:mm:ss')
          builder.where('start_time', '>', formated)
        }
      })
      query.preload('gwReservation', (builder) => {
        builder.where('flag', 1)
        if (isFuture) {
          const dt = DateTime.local()
          const formated = dt.toFormat('yyyy-MM-dd')
          builder.where('reservation_date', '>', formated)
        }
      })
      query.preload('irregularReservation', (builder) => {
        builder.where('flag', 1)
        if (isFuture) {
          const dt = DateTime.local()
          const formated = dt.toFormat('yyyy-MM-dd HH:mm:ss')
          builder.where('start_time', '>', formated)
        }
      })
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
      u_id?: string
      withPoints?: number
      withReservations?: number
      isFuture?: number
      withCustomer?: number
    } = {}
  ) {
    interface Args {
      id?: number
      find?: number
      symbols?: string
      u_id?: string
      withPoints?: number
      withReservations?: number
      isFuture?: number
      withCustomer?: number
    }
    let args: Args = {}
    // idで絞り込み
    if (request.id) args = { find: Number(request.id), symbols: '=' }
    // u_idで絞り込み
    else if (request.u_id) args = { u_id: request.u_id }

    if (request.withPoints) args.withPoints = Number(request.withPoints)
    if (request.withReservations) args.withReservations = Number(request.withReservations)
    if (request.isFuture) args.isFuture = Number(request.isFuture)
    if (request.withCustomer) args.withCustomer = Number(request.withCustomer)

    const rows = await this.get(args)
    const result = Array.isArray(rows.data) && rows.data.length ? rows.data[0] : null
    if (result && Number(request.withPoints)) {
      const userData = result.toJSON()
      let pointSum = 0
      if (userData.point && userData.point.length) {
        userData.point.forEach((point) => {
          if (point.type === 1) {
            pointSum += point.amount
          } else {
            pointSum -= point.amount
          }
        })
      }
      userData.pointSum = pointSum
      return userData
    }
    return result
  }
}
