import Database from '@ioc:Adonis/Lucid/Database'
import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class Post extends BaseModel {
  public static table = 'posts'
  @column({ isPrimary: true })
  public id: number

  @column()
  public flag: number

  @column()
  public slug: string

  @column()
  public title: string

  @column()
  public content: string

  @column()
  public type: number

  @column()
  public site: number

  @column()
  public external_link: number

  @column()
  public url: string

  @column()
  public publish_date: DateTime

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  public async getlist(
    request: {
      page?: number
      limit?: number
      order?: string
      orderBy?: 'asc' | 'desc' | 'rand' | undefined
      notIn?: string
      flags?: number[]
      type?: number[]
      site?: number[]
    } = {}
  ) {
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999
    const order: string = request.order || 'p.publish_date'
    const orderBy: 'asc' | 'desc' | 'rand' | undefined = request.orderBy || 'desc'

    const query = Database.from('posts as p').select('*').whereNot('p.flag', 999).clone()

    if (orderBy !== 'rand') query.orderBy(order, orderBy)
    else query.orderBy(Database.raw('RAND()'))

    if (request.flags) {
      query.whereIn('p.flag', request.flags)
    }

    if (request.type) {
      query.whereIn('p.type', request.type)
    }

    if (request.site) {
      query.whereIn('p.site', request.site)
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()
    return json
  }

  public async getdetail(
    request: {
      page?: number
      limit?: number
      id?: number[]
      slug?: string
      notIn?: string
      type?: number[]
      site?: number[]
    } = {}
  ) {
    const page: number = request.page || 1
    const limit: number = request.limit || 99999999

    const query = Database.from('posts as p').select('*').whereNot('p.flag', 999).clone()

    if (request.id) {
      query.whereIn('p.id', request.id)
    }

    if (request.slug) {
      query.where('p.slug', request.slug)
    }

    if (request.type) {
      query.whereIn('p.type', request.type)
    }

    if (request.site) {
      query.whereIn('p.site', request.site)
    }

    const paginator: any = await query.paginate(page, limit)
    const json: any = paginator.toJSON()
    return json
  }
}
