// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import Mail from '@ioc:Adonis/Addons/Mail'
import Point from 'App/Models/Point'
import Shop from 'App/Models/Shop'
import LineUser from 'App/Models/LineUser'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** axios */
const axios = require('axios')

// shopserve
const SHOPSERVE_SHOPID = process.env.SHOPSERVE_SHOPID
const SHOPSERVE_MANAGER_KEY = process.env.SHOPSERVE_MANAGER_KEY

/** lib */
import { DateTime } from 'luxon'
import { nanoid } from 'nanoid'

export default class PointsController {
  /**
   * ポイント登録
   */
  public async create({ request, response }) {
    let result: {
      status: number
      pointId?: number | null
      activatekey?: string | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      flag: number
      type: number
      line_user_id?: number
      amount: number
      shop_id?: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.flag || !params.type || !params.amount) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    // ポイント利用の場合(type === 2)
    // ec側のポイント増減はリアルタイムで反映されないため利用可能分があるか確認
    // 不足している場合には返却
    if (params.type === 2 && params.line_user_id) {
      // line_user_idからcustomerIdを取得
      const lineUserModel = new LineUser()
      const lineUser = await lineUserModel.getDetail({ id: params.line_user_id, withCustomer: 1 })
      const customerId = lineUser.ecUser?.[0]?.customer_id || null
      // ec連携されていたらec側のポイント確認
      if (customerId) {
        const res = await this.getEcPoint(customerId)
        if (res.status === 200 && Number(res.point)) {
          const point = Number(res.point)
          if (point < params.amount) {
            result = {
              status: 403,
              message: 'Point is not enough',
            }
            return helper.frontOutput(response, result)
          }
        } else {
          return helper.frontOutput(response, {
            status: 500,
            message: 'failed to get ec point.',
          })
        }
      }
    }

    try {
      const now = DateTime.local()
      const time = { created_at: now, updated_at: now }

      /** activatekeyとexpireを設定 */
      let activatekey = null
      const insertData: {
        activatekey: string | null
        expire: DateTime
      } = {
        activatekey,
        expire: now.plus({ days: 1 }), // luxonのオブジェクトはミュータブル
        ...params,
        ...time,
      }
      // shop_idがある（LINEフォロー時以外）はアクティベートキーを登録
      if (params.shop_id) insertData.activatekey = nanoid(28)

      // ポイント登録
      let pointModel = new Point()
      // postされたデータをfillして
      pointModel.fill(insertData)
      // 登録
      await pointModel.save()

      const point = pointModel.toJSON()
      result = {
        status: 200,
        pointId: point.id,
        activatekey: point.activatekey,
      }
    } catch (error) {
      result = {
        status: 500,
        pointId: null,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ポイント更新
   */
  public async update({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
      line_user_id: number
      is_processed?: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    const now = DateTime.local()
    const time = { updated_at: now }

    try {
      // 登録済みであるかの確認
      const pointModel = new Point()
      const target = await pointModel.getDetail({
        id: params.id,
        withShop: 1,
        flags: [10],
      })

      if (!target) {
        // 登録されていなければ返却
        helper.frontOutput(response, {
          status: 404,
          message: 'Point not found.',
        })
        return
      }

      // lineUser取得
      const lineUserModel = new LineUser()
      const lineUser = await lineUserModel.getDetail({
        id: params.line_user_id,
        withCustomer: 1,
      })

      // LINE連携されているか
      const customerId = lineUser?.ecUser[0]?.customer_id || null

      // ポイント利用の場合(type === 2)
      // ec側のポイント増減はリアルタイムで反映されないため利用可能分があるか確認
      // 不足している場合には返却
      if (customerId && target.type === 2) {
        const res = await this.getEcPoint(customerId)
        if (res.status === 200 && Number(res.point)) {
          const point = Number(res.point)
          if (point < target.amount) {
            result = {
              status: 403,
              message: 'Point is not enough',
            }
            helper.frontOutput(response, result)
          }
        } else {
          helper.frontOutput(response, {
            status: 500,
            message: 'failed to get ec point.',
          })
        }
      }

      // ec連携している場合はまずec側のポイント操作
      const env = helper.getEnvironment(request)
      const localTestFlag = 0
      if (customerId && (env.name === 'production' || localTestFlag)) {
        const operationPoint = target.type === 1 ? target.amount : target.amount * -1
        const ecData = {
          account: customerId,
          operation_point: operationPoint,
          note: target.shop?.label || '店舗不明(LINE)',
        }
        const isOperated = await this.operationPoint(ecData)
        params.is_processed = isOperated.status === 200 ? 1 : 0

        // ポイント利用でshopserve側のポイント操作失敗の場合
        // 重複しての利用を避けるため、ポイント無効化しエラーとして返却
        if (isOperated.status !== 200 && target.type === 2) {
          const udtData = {
            id: params.id,
            flag: 999,
            activatekey: null,
            expire: null,
            ...time,
          }
          const invalidTarget = await Point.find(target.id)
          invalidTarget?.merge(udtData)
          await invalidTarget?.save()

          result = {
            status: 500,
            message: 'failed to operate ec point',
          }
          return helper.frontOutput(response, result)
        }
      }

      // 加算またはポイント操作が成功の場合はポイント有効化
      const updateData = {
        ...params,
        ...time,
      }
      // update
      target.merge(updateData)
      const updated = await target.save()

      const ENVIRONMENT = await helper.getEnvironment(request)
      if (target.type === 1 && target.shop_id) {
        // ショップ名を取得
        const shop = await Shop.find(target.shop_id)
        const mailObj = {
          ENVIRONMENT,
          amount: target.amount,
          uid: lineUser.u_id,
          linename: lineUser.linename,
          shopName: shop?.label || '店舗不明',
          updated_at: now.toFormat('yyyy/MM/dd HH:mm:ss').toString(),
        }
        // メール送信
        const subject: string = '【AKAGI & VENTURE PROJECT】 ポイント付与のお知らせ'
        const fromEmail: string | undefined = process.env.FROM_EMAIL
        const fromName: string | undefined = process.env.FROM_NAME
        if (fromEmail && fromName) {
          await Mail.send((message) => {
            message
              .from(fromEmail, fromName)
              .to('tech@cicac.jp')
              .subject(subject)
              .htmlView('emails/add_point', mailObj)
              .textView('emails/add_point-text', mailObj)
          })
        }
      }

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
   * 詳細取得
   */
  public async detail({ request, response }) {
    interface Result {
      status: number
      detail?: object | null
    }
    interface Params {
      id?: number
      activatekey?: string
      withShop?: number
      flags?: Array<number>
    }

    interface Args {
      id?: number
      activatekey?: string
      withShop?: number
      flags?: Array<number>
    }

    let params: Params = request.qs()
    let args: Args = {}

    if (!params.id && !params.activatekey) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    // stringで渡ってきたparamsをパース
    if (params.id) args.id = Number(params.id)
    if (params.activatekey) args.activatekey = params.activatekey
    if (params.withShop) args.withShop = params.withShop
    if (params.flags) args.flags = params.flags

    const pointModel = new Point()
    const point = await pointModel.getDetail(args)

    let result: Result = {
      status: 200,
      detail: point,
    }

    helper.frontOutput(response, result)
  }

  /** ecのポイントを取得 */
  public async getEcPoint(customer_id: string) {
    let result: {
      status: number
      point?: number
      error?: any
      message?: string
    } = { status: 200 }

    if (!customer_id) {
      result = {
        status: 400,
        message: 'Invalids parameter error !!',
      }
      return result
    }

    await axios({
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: SHOPSERVE_SHOPID,
        password: SHOPSERVE_MANAGER_KEY,
      },
      method: 'GET',
      url: 'https://management.api.shopserve.jp/v2/client/members-account/point',
      params: { account: customer_id },
    })
      .then((response) => {
        const res = response.data
        result.point = Number(res.point.valid_point)
      })
      .catch((error) => {
        result = {
          status: 500,
          message: 'shopserve api error',
          error,
        }
      })
    return result
  }

  public async operationPoint(data: { account: string; operation_point: number; note: string }) {
    let result: {
      status: number
      message?: string
      error?: any
    } = { status: 200 }

    await axios({
      headers: {
        'Content-Type': 'application/json',
      },
      auth: {
        username: SHOPSERVE_SHOPID,
        password: SHOPSERVE_MANAGER_KEY,
      },
      method: 'POST',
      url: 'https://management.api.shopserve.jp/v2/client/members-account/point/_operate',
      data,
    })
      .then(async () => {
        result = { status: 200 }
      })
      .catch((error) => {
        result = {
          status: 500,
          message: 'shopserve api error',
          error,
        }
      })
    return result
  }
}
