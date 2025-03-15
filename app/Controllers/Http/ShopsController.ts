// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import ShopModel from 'App/Models/Shop'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
import { DateTime } from 'luxon'

export default class ShopsController {
  /**
   * ショップ登録
   */
  public async create({ request, response }) {
    let result: {
      status: number
      exists?: boolean
      shopId?: number | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      flag: number
      label: string
      description?: string
      name: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.flag || !params.label || !params.name) {
      helper.frontOutput(response, {
        status: 422,
        exists: false,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      // name重複判定
      let existsShop = await ShopModel.findBy('name', params.name)
      if (existsShop) {
        return helper.frontOutput(response, {
          status: 200,
          exists: true,
          message: 'Duplicate shop name!',
        })
      }

      const now = DateTime.local()
      const time = { created_at: now, updated_at: now }
      const insertData = {
        ...params,
        ...time,
      }

      // ショップ登録
      let shopModel = new ShopModel()
      // postされたデータをfillして
      shopModel.fill(insertData)
      // 登録
      await shopModel.save()

      const shop = shopModel.toJSON()
      result = {
        status: 200,
        exists: false,
        shopId: shop.id,
      }
    } catch (error) {
      result = {
        status: 500,
        exists: false,
        shopId: null,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ショップ更新
   */
  public async update({ request, response }) {
    let result: {
      status: number
      exists?: boolean
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
      name: string
      flag: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.id || !params.flag) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      /** flag = 999でないときはnameの重複判定もおこなう */
      if (Number(params.flag) !== 999) {
        if (!params.name) {
          helper.frontOutput(response, {
            status: 422,
            message: 'Invalid parameter error.',
          })
          return
        }
        // name重複判定
        let existsShop = await ShopModel.findBy('name', params.name)
        if (existsShop) {
          const existsData = existsShop.toJSON()
          if (Number(params.id) !== existsData.id) {
            return helper.frontOutput(response, {
              status: 200,
              exists: true,
              message: 'Duplicate shop name!',
            })
          }
        }
      }

      // 登録済みであるかの確認
      let target = await ShopModel.find(params.id)
      if (!target) {
        // 登録されていなければ返却
        helper.frontOutput(response, {
          status: 404,
          message: 'Shop not found.',
        })
        return
      }

      const now = DateTime.local()
      const time = { updated_at: now }
      const updateData = {
        ...params,
        ...time,
      }

      // 更新するデータをmergeして
      target.merge(updateData)
      // 更新
      const updated = await target.save()

      result = {
        status: 200,
        updated: updated.id ? true : false,
      }
    } catch (error) {
      result = {
        status: 500,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * リスト取得
   */
  public async list({ request, response }) {
    interface Result {
      status: number
      list?: object | null
    }
    interface Params {}

    interface Args {}

    let params: Params = request.qs()
    let args: Args = {}

    args = params

    const shopModel = new ShopModel()
    const shops = await shopModel.get(args)

    let result: Result = {
      status: 200,
      list: shops,
    }

    helper.frontOutput(response, result)
  }

  /**
   * shop詳細取得
   */
  public async detail({ request, response }) {
    interface Result {
      status: number
      detail: object | null
    }
    interface Params {
      id?: string // getで渡ってくるためstring
      name?: string
    }
    interface Args {
      id?: number // 引数ではnumber
      name?: string
    }

    let params: Params = request.qs()
    let args: Args = {}
    // stringで渡ってきたparmasをパース
    if (params.id) args.id = Number(params.id)
    if (params.name) args.name = params.name

    const shopModel = new ShopModel()
    const shop = await shopModel.getDetail(args)

    let result: Result = {
      status: 200,
      detail: shop,
    }

    helper.frontOutput(response, result)
  }
}
