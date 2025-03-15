import Hash from '@ioc:Adonis/Core/Hash'
import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import {
  BaseModel,
  column,
  beforeSave,
  hasOne,
  HasOne,
  manyToMany,
  ManyToMany,
} from '@ioc:Adonis/Lucid/Orm'
import Helper from 'App/Helper'
import Role from 'App/Models/Role'
import Shop from 'App/Models/Shop'
const helper = new Helper()

export default class User extends BaseModel {
  public static table = 'users'

  @hasOne(() => Role, {
    foreignKey: 'user_id',
    localKey: 'id',
  })
  public role: HasOne<typeof Role>

  /** relaionships */
  @manyToMany(() => Shop, {
    pivotTable: 'user_shops',
    localKey: 'id',
    pivotForeignKey: 'user_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'shop_id',
  })
  public shops: ManyToMany<typeof Shop>

  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number

  @column()
  public username: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }

  @column()
  public activatekey: string | null

  @column.dateTime()
  public expiry: DateTime | null

  @column()
  public updateEmail: string | null

  @column()
  public loginFailedCount: number

  @column.dateTime()
  public loginUnbannedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  /**
   * 引数を受け取って当該の user(s) を返す
   * @param object
   *   find         targetの対象value
   *   target       検索対象
   *   symbols      オペレータ
   *   page         ページインデックス？
   *   limit        取得件数
   *   email        メールアドレス絞り込み
   *   isAddress    住所の有無
   *   isReadflags  閲覧チェックの有無
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
      email?: string
      role?: number[]
      flags?: number[]
    } = {}
  ) {
    const find: number | string = request.find || 0
    const target: string = request.target || 'u.id'
    const symbols: string = request.symbols || '>'
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const order: string = request.order || 'u.created_at'
    const orderBy: 'asc' | 'desc' | 'rand' | undefined = request.orderBy || 'asc'

    const query = User
      // lint
      .query()
      .from('users as u')
      .where(target, symbols, find)
      .clone()

    query.preload('role')
    query.preload('shops')

    // 並び順の指定
    if (orderBy !== 'rand') query.orderBy(order, orderBy)
    else query.orderBy(Database.raw('RAND()'))

    // 指定IDを除く
    if (request.notIn && request.notIn.length) {
      // notInは文字列で渡ってくるため配列にパース
      query.whereNotIn('u.id', JSON.parse(request.notIn))
    }

    // flag絞り込み
    if (request.flags && request.flags.length) {
      query.whereIn('u.flag', request.flags)
    } else {
      query.whereIn('u.flag', [1])
    }

    // emailで絞り込み
    if (request.email) {
      query.where({ email: request.email })
    }

    if (request.role && request.role.length) {
      query.innerJoin('roles as r', 'u.id', 'r.user_id').whereIn('r.role', request.role)
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()

    // url成形のためjson.dataをadjustUrlsに潜らせる
    // let data = json.data
    // json.data = helper.adjustUrls(data)
    return json
  }

  /**
   * user詳細取得
   */
  public async getDetail(
    request: {
      id?: number
      email?: string
      flags?: number[]
    } = {}
  ) {
    interface Args {
      id?: number
      find?: number
      symbols?: string
      email?: string
      flags?: number[]
    }
    let args: Args = {}
    // idで絞り込み
    if (request.id) args = { find: Number(request.id), symbols: '=' }
    // emailで絞り込み
    else if (request.email) args = { email: request.email }
    // flags
    if (request.flags) args.flags = request.flags

    const rows = await this.get(args)
    return Array.isArray(rows.data) && rows.data.length ? rows.data[0] : null
  }

  /**
   * 引数を受け取って対象のユーザーのログイン制限を管理する
   * @param object
   *   email    対象のユーザーE-mail
   *   unbanned true => ログイン制限を解除 / false => ログイン制限を実施
   */
  public async manageBanned(
    request: {
      email?: string
      unbanned?: boolean
    } = {}
  ): Promise<object> {
    let result: {
      isBanned: boolean
      unbannedTime: DateTime | null
    } = {
      isBanned: false,
      unbannedTime: null,
    }

    if (!request.email) return { message: 'require email.' }

    const user = await User.findBy('email', request.email)

    if (request.unbanned) {
      const data = { loginFailedCount: 0, loginUnbannedAt: null }
      if (user) user.merge(data).save()
    } else {
      if (user) {
        let currentCount: number = user.loginFailedCount
        user.merge({ loginFailedCount: (currentCount += 1) }).save()

        // マスターデータからBANの条件を取得
        const MASTER: { [key: string]: any } = helper.master()

        if (currentCount >= MASTER.system.ban.count) {
          const expiry = DateTime.local().plus({ minutes: MASTER.system.ban.minute })
          user.merge({ loginUnbannedAt: expiry }).save()
          result = {
            isBanned: true,
            unbannedTime: expiry,
          }
        }
      }
    }
    return result
  }
}
