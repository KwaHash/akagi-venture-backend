import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'
import Database from '@ioc:Adonis/Lucid/Database'

export default class Holiday extends BaseModel {
  public static table = 'holidays'

  // column list
  @column({ isPrimary: true })
  public id: number

  @column()
  public holiday_at: Date

  @column()
  public label: string

  @column()
  public flag: number

  @column()
  public shop_id: number

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  /**
   * 引数を受け取って当該の holidays(s) を返す
   * @param object
   *   find         targetの対象value
   *   target       検索対象
   *   symbols      オペレータ
   *   order        オーダー対象カラム
   *   orderBy      オーダー順
   */
  public async get(
    request: {
      find?: number | string
      target?: string
      symbols?: string
      order?: string
      orderBy?: 'asc' | 'desc' | 'rand' | undefined
      year?: number | null
      month?: number | null
      shop_id?: number
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'h.id'
    const symbols: string = request.symbols || '>'
    const order: string = request.order || 'h.created_at'
    const orderBy: 'asc' | 'desc' | 'rand' | undefined = request.orderBy || 'asc'
    const year: number = request.year || 0
    const month: number = request.month || 0
    const shopId: number = request.shop_id || 0

    const query = Holiday
      // lint避け
      .query()
      .from('holidays as h')
      .where(target, symbols, find)
      .clone()

    query.where('h.flag', 1)

    // 並び順の指定
    if (orderBy !== 'rand') query.orderBy(order, orderBy)
    else query.orderBy(Database.raw('RAND()'))

    if (year) {
      query.whereRaw(`DATE_FORMAT(h.holiday_at, '%Y') = ${year}`)
    }

    if (month) {
      query.whereRaw(`DATE_FORMAT(h.holiday_at, '%m') = ${month}`)
    }

    if (shopId) {
      query.where('shop_id', shopId)
    }

    const result: any = await query.pojo()

    if (result && result.length) {
      result.forEach((row, i, targetArray) => {
        const targetSQLDate = DateTime.fromJSDate(row.holiday_at).toFormat('yyyy-MM-dd').toString()
        targetArray[i].holiday_at = targetSQLDate
      })
    }

    return result
  }
}
