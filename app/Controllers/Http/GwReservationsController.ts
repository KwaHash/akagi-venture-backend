// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import Mail from '@ioc:Adonis/Addons/Mail'
import GwReservationModel from 'App/Models/GwReservation'
import LineUserModel from 'App/Models/LineUser'
import Line from 'App/Controllers/Http/LineController'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
import { DateTime } from 'luxon'
// import { StringFilter } from 'aws-sdk/clients/securityhub'
// import { LicenseManagerUserSubscriptions } from 'aws-sdk'
const fs = require('fs')
const yaml = require('js-yaml')

const path = require('path')
const accessorPath = path.join(__dirname, '../../../calendar/GoogleCalendarAccessor')
const GoogleCalendarAccessor = require(accessorPath)

/** params/data */
const baconFilePath = 'data/master/bacon.yaml'
const localCalendarId =
  'c_af4d57fd48653c5e78b5692416efec40d094f4db547c61bb63857cd58aa96624@group.calendar.google.com'
const prodCalendarId =
  'c_c17cd18a44c4dadd00a708ac8e5a4dacdedc8bad248ca58931ecc53d10a9676e@group.calendar.google.com'

// local確認用カレンダーURL
// https://calendar.google.com/calendar/embed?src=c17cd18a44c4dadd00a708ac8e5a4dacdedc8bad248ca58931ecc53d10a9676e%40group.calendar.google.com&ctz=Asia%2FTokyo

export default class ReservationsController {
  public loadYaml(filepath) {
    const yamlText = fs.readFileSync(filepath, 'utf8')
    return yaml.load(yamlText)
  }

  /**
   * routerからの予約登録
   */
  public async create({ request, response }) {
    interface Params {
      line_user_id?: number
      reservation_date?: any
      num_adult?: number
      num_jr?: number
      num_kids?: number
      tel?: string
      linename?: string
      course?: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    const ENVIRONMENT = helper.getEnvironment(request)

    const statusData = await this.creating({
      request: params,
      ENVIRONMENT,
    })
    return helper.frontOutput(response, statusData)
  }

  /**
   * 予約登録の実体
   * @param request      params情報
   * @param ENVIRONMENT  env情報(helper.getEnvironment)
   */
  public async creating({ request, ENVIRONMENT }) {
    let result: {
      status: number
      reservationId?: number | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      line_user_id?: number // lineUsersのprimary key
      reservation_date?: any
      num_adult?: number
      num_jr?: number
      num_kids?: number
      tel?: string
      linename?: string
      course?: number
    }

    let params: Params
    params = request

    if (
      !params.line_user_id ||
      !params.reservation_date ||
      !params.tel ||
      !params.linename ||
      !params.num_adult ||
      !params.course
    ) {
      return {
        status: 422,
        reservationId: null,
        message: 'Invalid parameter error.',
      }
    }

    const now = DateTime.local()
    const regTime = { created_at: now, updated_at: now }
    const upTime = { updated_at: now }

    // コースから開始・終了時間を設定
    const start = params.course === 1 ? '18:00' : '20:00'
    const end = params.course === 1 ? '19:30' : '21:30'

    try {
      /** LineUserIdが登録済みであるかの確認 */
      let lineUser = await LineUserModel.find(params.line_user_id)
      if (!lineUser) {
        // 登録されていなければ返却
        return {
          status: 404,
          reservationId: null,
          message: 'LineUser not found.',
        }
      }

      // admin以外で予約がすでにある場合には返却
      const args = {
        id: lineUser.id,
        isFuture: 1,
        withReservations: 1,
      }
      const lineUserModel = new LineUserModel()
      const lineUserDetail = await lineUserModel.getDetail(args)
      if (!lineUserDetail.admin.length && lineUserDetail.gwReservation.length) {
        return {
          status: 422,
          reservationId: null,
          message: 'reservation is already existed',
        }
      }

      /**
       * 予約可能かどうか確認
       *  DBからstart_timeからendTimeに含まれる予約をすべて取得
       *  タイプごとに整理して、data/bacon.yamlのlimitを確認して判定
       */
      const checkStatus = await this.getReservesStatus({
        date: params.reservation_date,
        course: params.course,
      })
      if (!checkStatus.canReserves) {
        return {
          status: 200,
          reservationId: null,
          message: 'The reservation was full.',
        }
      }

      /**
       * DBに仮予約を発行
       */
      const insertData = {
        event_id: null,
        flag: 10,
        ...params,
        ...regTime,
      }

      // 登録
      const reservationModel = new GwReservationModel()
      reservationModel.fill(insertData)
      await reservationModel.save()

      /**
       * ここでもう一度予約が本当にできるか確認する
       */
      const secondCheckStatus = await this.getReservesStatus({
        date: params.reservation_date,
        course: params.course,
      })

      // 予約不可であればflag=998に更新しフロントに返却
      if (!secondCheckStatus.canReserves) {
        try {
          const updateData = {
            flag: 998,
            ...upTime,
          }
          // 更新するデータをmergeして
          reservationModel.merge(updateData)
          // 更新
          await reservationModel.save()
          return {
            status: 200,
            reservationId: null,
            message: 'The reservation was full.',
          }
        } catch (error) {
          console.log(error)
          return {
            status: 500,
            reservationId: null,
            message: 'An error occurred during update record flag.',
          }
        }
      }

      /**
       * Googleカレンダーに予定を追加
       * @ref https://developers.google.com/calendar/api/quickstart/nodejs?hl=ja
       */
      let eventId
      try {
        const calendarId = ENVIRONMENT.name === 'production' ? prodCalendarId : localCalendarId
        const calendar = new GoogleCalendarAccessor(calendarId)

        const sum = Number(params.num_adult) + Number(params.num_jr) + Number(params.num_kids)
        /** アクセサーを使ってカレンダーに予定を新規追加 */
        const description = `
          名前: ${params.linename}様
          電話番号: ${params.tel}
          人数(大人): ${params.num_adult}
          人数(中学生以上): ${params.num_jr}
          人数(小学生): ${params.num_kids}
        `
        const calendarResult = await calendar.insert({
          summary: `【予約プビ】 ${params.linename}様：${sum}名`,
          description: description,
          startTime: DateTime.fromSQL(`${params.reservation_date} ${start}:00`).toISO().toString(),
          endTime: DateTime.fromSQL(`${params.reservation_date} ${end}:00`).toISO().toString(),
        })
        if (calendarResult.error || calendarResult.data.error) {
          console.error(calendarResult)
          return {
            status: 500,
            reservationId: null,
            message: 'An error occurred during calendar registration.',
          }
        }
        /** エラーなければeventIdが発行 */
        eventId = calendarResult.data.id
      } catch (error) {
        console.log(error)
        return {
          status: 500,
          reservationId: null,
          message: 'An error occurred during calendar registration.',
        }
      }

      /** DBにデータを登録 */
      const updateData = {
        event_id: eventId,
        flag: 1,
        ...upTime,
      }

      // 更新するデータをmergeして
      reservationModel.merge(updateData)
      // 更新
      await reservationModel.save()

      const reservation = reservationModel.toJSON() // serialize

      reservation.start = start
      reservation.end = end

      // line送信
      const lineData: {
        u_id: string | null
        rsvData: any
      } = {
        u_id: lineUser.u_id,
        rsvData: reservation,
      }
      const line = new Line()
      await line.sendCreatedGwReservation(lineData)

      // メール送信
      if (ENVIRONMENT.name === 'production') {
        const plan = {
          reservation_date: DateTime.fromSQL(params.reservation_date).toFormat('yyyy/MM/dd'),
        }
        const data = { ENVIRONMENT, reservation, plan }
        const subject: string = '【bacon BBQ BEER GARDEN】 新規ご予約'
        const fromEmail: string | undefined = process.env.FROM_EMAIL
        const fromName: string | undefined = process.env.FROM_NAME
        if (fromEmail && fromName) {
          await Mail.send((message) => {
            message
              .from(fromEmail, fromName)
              .to('google@akagi-venture.jp')
              .cc('michi@fukubuta.co.jp')
              .cc('imauji@cicac.jp')
              .subject(subject)
              .htmlView('emails/gwReservation_create', data)
              .textView('emails/gwReservation_create-text', data)
          })
        }
      }

      result = {
        status: 200,
        reservationId: reservation.id,
      }
    } catch (error) {
      result = {
        status: 500,
        reservationId: null,
        message: error.message,
      }
    }
    return result
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
      line_user_id?: number
      startTime?: string
      endTime?: string
    }

    interface Args {
      line_user_id?: number
      between?: any
    }

    let params: Params = request.qs()
    let args: Args = {}

    if (!params.line_user_id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    // stringで渡ってきたparamsをパース
    if (params.line_user_id) args.line_user_id = Number(params.line_user_id)
    if (params.startTime && params.endTime) args.between = [params.startTime, params.endTime]

    const rsvModel = new GwReservationModel()
    const reserves = await rsvModel.get(args)

    const bacon = this.loadYaml(baconFilePath)
    const resultReserveData: {
      meta: object
      data: any
    } = {
      meta: reserves.meta,
      data: [],
    }
    reserves.data.forEach((reserve) => {
      const rsvData = reserve.toJSON()
      const targetPlan = bacon.plans.find((plan) => Number(plan.id) === Number(rsvData.plan_id))
      rsvData.plan = targetPlan
      resultReserveData.data.push(rsvData)
    })

    let result: Result = {
      status: 200,
      list: resultReserveData,
    }

    helper.frontOutput(response, result)
  }

  /**
   * 空き取得
   */
  public async empty({ request, response }) {
    /** setting */
    const params = request.all()

    const days: any = []
    Object.keys(params).forEach((r) => {
      days.push(params[r])
    })

    interface Result {
      status: number
      empty?: any
    }

    let result: Result = {
      status: 200,
      empty: [],
    }
    await Promise.all(
      days.map(async (d) => {
        const obj: { date: string; course: Array<number> } = { date: d.date, course: [] }
        await Promise.all(
          d.course.map(async (c) => {
            const checkStatus = await this.getReservesStatus({
              date: d.date,
              course: c,
            })
            if (checkStatus.canReserves) obj.course.push(c)
          })
        )
        if (obj.course.length) result.empty.push(obj)
      })
    )

    helper.frontOutput(response, result)
  }

  /**
   * 予約状況を確認
   */
  public async getReservesStatus({ date, course }) {
    let result: {
      canReserves: boolean
    } = {
      canReserves: false,
    }

    if (!date || !course) return result

    /** DBから対象日の予約一覧を取得 */
    const args: {
      reservation_date: string
      course: number
      flags: Array<number>
    } = {
      reservation_date: date,
      course: course,
      flags: [1],
    }

    const max = 15
    const rsvModel = new GwReservationModel()
    const reserves = await rsvModel.get(args) // flag=1のみ取得
    if (reserves && reserves.data.length < max) result.canReserves = true // 15件未満であればtrue

    return result
  }

  /**
   * 予約キャンセル
   */
  public async delete({ request, response }) {
    let result: {
      status: number
      deleted?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.id) {
      return helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error. [id]',
      })
    }

    try {
      // 登録済みであるかの確認
      let target = await GwReservationModel.query()
        .where('id', params.id)
        .andWhere('flag', 1)
        .first()
      if (!target) {
        // 登録されていなければ返却
        return helper.frontOutput(response, {
          status: 404,
          message: 'Reservation not found.',
        })
      }

      /** init */
      const ENVIRONMENT = helper.getEnvironment(request)
      const calendarId = ENVIRONMENT.name === 'production' ? prodCalendarId : localCalendarId
      const calendar = new GoogleCalendarAccessor(calendarId)

      /**
       * Googleカレンダーの予定を削除
       * @ref https://developers.google.com/calendar/api/quickstart/nodejs?hl=ja
       */
      try {
        /** 既存の予約を削除 */
        const calendarDelete = await calendar.delete({
          eventId: target.event_id,
        })
        if (calendarDelete.data.error) {
          console.error(calendarDelete)
          return helper.frontOutput(response, {
            status: 500,
            deleted: false,
            message: 'An error occurred during calendar deletion.',
          })
        }
      } catch (error) {
        console.log(error)
        return helper.frontOutput(response, {
          status: 500,
          deleted: false,
          message: 'An error occurred during calendar deletion.',
        })
      }

      /**
       * targetレコードの削除
       */
      try {
        const now = DateTime.local()
        const time = { updated_at: now }
        const updateData = {
          flag: 999,
          ...time,
        }

        // 更新するデータをmergeして
        target.merge(updateData)
        // 更新
        const deleted = await target.save()

        result = {
          status: 200,
          deleted: deleted.id ? true : false,
        }
      } catch (error) {
        console.log(error)
        return helper.frontOutput(response, {
          status: 500,
          deleted: false,
          message: 'An error occurred during target record deletion.',
        })
      }

      // メール送信

      if (ENVIRONMENT.name === 'production') {
        const json = target.toJSON()
        const plan = {
          reservation_date: DateTime.fromJSDate(json.reservation_date).toFormat('yyyy/MM/dd'),
          start_time: target.course === 1 ? '18:00' : '20:00',
        }
        const data = {
          ENVIRONMENT,
          reservation: target,
          plan,
        }
        const subject: string = '【bacon Premium BBQ Beer Garden】 ご予約キャンセル'
        const fromEmail: string | undefined = process.env.FROM_EMAIL
        const fromName: string | undefined = process.env.FROM_NAME
        if (fromEmail && fromName) {
          await Mail.send((message) => {
            message
              .from(fromEmail, fromName)
              .to('google@akagi-venture.jp')
              .cc('michi@fukubuta.co.jp')
              .cc('imauji@cicac.jp')
              .subject(subject)
              .htmlView('emails/gwReservation_cancel', data)
              .textView('emails/gwReservation_cancel-text', data)
          })
        }
      }
    } catch (error) {
      result = {
        status: 500,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }
}
