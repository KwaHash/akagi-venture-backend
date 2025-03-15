// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import LineUserModel from 'App/Models/LineUser'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
import { DateTime } from 'luxon'

export default class LineUsersController {
  /**
   * ラインユーザー登録
   */
  public async create({ request, response }) {
    let result: {
      status: number
      lineUserId?: number | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      flag: number
      u_id: string
      linename: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.flag || !params.u_id || !params.linename) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      const now = DateTime.local()

      /** 重複確認 */
      let exists = await LineUserModel.findBy('u_id', params.u_id)
      if (exists) {
        // 登録されていればflagを1に更新する
        const existsData = exists.toJSON()
        const upTime = { updated_at: now }
        const updateData = {
          id: existsData.id,
          ...params,
          ...upTime,
        }
        // 更新するデータをmergeして
        exists.merge(updateData)
        // 更新
        await exists.save()
        result = {
          status: 200,
          lineUserId: existsData.id,
        }
        return helper.frontOutput(response, result)
      }

      /** 新規登録処理 */
      const regTime = { created_at: now, updated_at: now }
      const insertData = {
        ...params,
        ...regTime,
      }

      // ラインユーザー登録
      let lineUserModel = new LineUserModel()
      // postされたデータをfillして
      lineUserModel.fill(insertData)
      // 登録
      await lineUserModel.save()

      const lineUser = lineUserModel.toJSON()
      result = {
        status: 200,
        lineUserId: lineUser.id,
      }
    } catch (error) {
      result = {
        status: 500,
        lineUserId: null,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ラインユーザー更新
   */
  public async update({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      flag: number
      u_id: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.flag || !params.u_id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      // 登録済みであるかの確認
      let target = await LineUserModel.findBy('u_id', params.u_id)

      if (!target) {
        // 登録されていなければ返却
        helper.frontOutput(response, {
          status: 404,
          message: 'LineUser not found.',
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
   * 詳細取得
   */
  public async detail({ request, response }) {
    interface Result {
      status: number
      detail?: object | null
    }
    interface Params {
      id?: number
      u_id?: string
      withPoints?: number
      withReservations?: number
      isFuture?: number
      withCustomer?: number
    }

    interface Args {
      id?: number
      u_id?: string
      withPoints?: number
      withReservations?: number
      isFuture?: number
      withCustomer?: number
    }

    let params: Params = request.qs()
    let args: Args = {}

    if (!params.u_id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    // stringで渡ってきたparamsをパース
    if (params.u_id) args.u_id = params.u_id
    if (params.withPoints) args.withPoints = Number(params.withPoints)
    if (params.withReservations) args.withReservations = Number(params.withReservations)
    if (params.isFuture) args.isFuture = Number(params.isFuture)
    if (params.withCustomer) args.withCustomer = Number(params.withCustomer)

    const lineUserModel = new LineUserModel()
    const users = await lineUserModel.getDetail(args)

    let result: Result = {
      status: 200,
      detail: users,
    }

    helper.frontOutput(response, result)
  }
}
