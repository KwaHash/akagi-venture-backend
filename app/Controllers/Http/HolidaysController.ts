// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import HolidayModel from 'App/Models/Holiday'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
import { DateTime } from 'luxon'

export default class HolidaysController {
  /**
   * Holiday登録
   */
  public async create({ request, response }) {
    let result: {
      status: number
      holidayId?: number | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      holiday_at: Date
      label: string
      shop_id: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.holiday_at || !params.label || !params.shop_id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      const now = DateTime.local()
      const time = { created_at: now, updated_at: now }
      const insertData = {
        ...params,
        ...time,
      }

      // ショップ登録
      let holidayModel = new HolidayModel()
      holidayModel.fill(insertData)
      // 登録
      await holidayModel.save()

      const holiday = holidayModel.toJSON()
      result = {
        status: 200,
        holidayId: holiday.id,
      }
    } catch (error) {
      result = {
        status: 500,
        holidayId: null,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * holiday更新
   */
  public async update({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
      holiday_at: Date
      label: string
      shop_id: number
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

    try {
      // 登録済みであるかの確認
      let target = await HolidayModel.find(params.id)
      if (!target) {
        // 登録されていなければ返却
        helper.frontOutput(response, {
          status: 404,
          message: 'Holiday not found.',
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
    interface Params {
      shop_id?: number
      year?: number
      month?: number
    }

    interface Args {
      shop_id?: number
      year?: number
      month?: number
    }

    let params: Params = request.qs()
    let args: Args = {}

    if (params.shop_id) args.shop_id = Number(params.shop_id)
    if (params.year) args.year = Number(params.year)
    if (params.month) args.month = Number(params.month)

    const holidayModel = new HolidayModel()
    const holidays = await holidayModel.get(args)

    let result: Result = {
      status: 200,
      list: holidays,
    }

    helper.frontOutput(response, result)
  }
}
