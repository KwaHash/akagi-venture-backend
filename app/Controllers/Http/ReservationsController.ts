// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import Mail from '@ioc:Adonis/Addons/Mail'
import ReservationModel from 'App/Models/Reservation'
import HolidayModel from 'App/Models/Holiday'
import LineUserModel from 'App/Models/LineUser'
import AdminModel from 'App/Models/Admin'
import Line from 'App/Controllers/Http/LineController'
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
import { DateTime } from 'luxon'
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
      plan_id?: number
      start_time?: any
      end_time?: any
      num_adult?: number
      num_kids?: number
      tel?: string
      linename?: string
      shop_id?: number
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
      from: 'router',
    })
    return helper.frontOutput(response, statusData)
  }

  /**
   * 予約登録の実体
   * @param request      params情報
   * @param ENVIRONMENT  env情報(helper.getEnvironment)
   * @param from         'router'・'method'どちらからのアクセスか
   */
  public async creating({ request, ENVIRONMENT, from }) {
    let result: {
      status: number
      reservationId?: number | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id?: number // methodアクセス時idが入る
      line_user_id?: number // lineUsersのprimary key
      plan_id?: number
      start_time?: any
      end_time?: any
      num_adult?: number
      num_kids?: number
      num_preschooler?: number
      tel?: string
      linename?: string
      shop_id?: number
    }

    interface Args {
      line_user_id?: number
      between?: any
    }
    interface AdminArgs {
      foreign_type?: number
      foreign_id?: number
    }

    let params: Params
    params = request
    if (!params.num_kids) params.num_kids = 0

    if (
      !params.line_user_id ||
      !params.plan_id ||
      !params.start_time ||
      !params.end_time ||
      !params.tel ||
      !params.linename ||
      !params.num_adult ||
      !params.shop_id
    ) {
      return {
        status: 422,
        reservationId: null,
        message: 'Invalid parameter error.',
      }
    }

    // shopIdは分離してparamsから削除
    const shopId = params.shop_id
    if (params.shop_id) delete params.shop_id

    const now = DateTime.local()
    const regTime = { created_at: now, updated_at: now }
    const upTime = { updated_at: now }
    const st = DateTime.fromSQL(params.start_time).toFormat('yyyy-MM-dd')

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

      /** 同一日程で同一ユーザーの予約確認 */
      let args: Args = {
        between: [params.start_time, params.end_time],
        line_user_id: Number(params.line_user_id),
      }
      let adminArgs: AdminArgs = {
        foreign_type: 1,
        foreign_id: Number(params.line_user_id),
      }
      const rsvModel = new ReservationModel()
      const exists = await rsvModel.get(args)
      const adminModel = new AdminModel()
      const adminLineUser = await adminModel.get(adminArgs) // あったらbypss, なければ終了
      if (
        exists &&
        exists.data.length &&
        from === 'router' &&
        (!adminLineUser || !adminLineUser.data.length)
      ) {
        // 同一日程・同一ユーザで予約済みなら返却
        return {
          status: 403,
          reservationId: null,
          message: 'Reservations exist for the same line user.',
        }
      }

      /**
       * 予約可能かどうか確認
       *  DBからstart_timeからendTimeに含まれる予約をすべて取得
       *  タイプごとに整理して、data/bacon.yamlのlimitを確認して判定
       */
      if (params.id) delete params.id // params.idが来ることがあるがcreatingでは不要
      const checkStatus = await this.getReservesStatus({
        date: st,
        start_time: params.start_time,
        end_time: params.end_time,
        plan_id: params.plan_id,
        shop_id: shopId,
      })
      // console.log('=====firstCheck=====') // 安定するまでログに残す
      // console.log(checkStatus)
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
      const reservationModel = new ReservationModel()
      reservationModel.fill(insertData)
      await reservationModel.save()

      /**
       * ここでもう一度予約が本当にできるか確認する
       */
      const secondCheckStatus = await this.getReservesStatus({
        date: st,
        start_time: params.start_time,
        end_time: params.end_time,
        plan_id: params.plan_id,
        shop_id: shopId,
      })
      // console.log('=====secondCheck=====') // 安定するまでログに残す
      // console.log(secondCheckStatus)
      // 2回めの確認時に予約不可ならflagを998にして返却
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
      const bacon = this.loadYaml(baconFilePath)
      const targetPlan = bacon.plans.find((plan) => Number(plan.id) === Number(params.plan_id))
      let eventId
      try {
        const calendarId = ENVIRONMENT.name === 'production' ? prodCalendarId : localCalendarId
        const calendar = new GoogleCalendarAccessor(calendarId)

        const sum = Number(params.num_adult) + Number(params.num_kids)
        /** アクセサーを使ってカレンダーに予定を新規追加 */
        const description = `
          名前: ${params.linename}様
          電話番号: ${params.tel}
          人数(大人): ${params.num_adult}
          人数(子供): ${params.num_kids}
          人数(未就学児): ${params.num_preschooler}
        `
        const calendarResult = await calendar.insert({
          summary: `【予約${targetPlan.nickname}】 ${params.linename}様：${sum}名`,
          description: description,
          startTime: DateTime.fromSQL(params.start_time).toISO().toString(),
          endTime: DateTime.fromSQL(params.end_time).toISO().toString(),
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

      // line送信
      const lineData: {
        u_id: string | null
        rsvData: any
        plan: any
      } = {
        u_id: lineUser.u_id,
        rsvData: reservation,
        plan: targetPlan,
      }
      const line = new Line()
      await line.sendCreatedReservation(lineData)

      // メール送信
      if (ENVIRONMENT.name === 'production') {
        const plan = {
          name: targetPlan.nickname,
          startTime: DateTime.fromSQL(params.start_time).toFormat('yyyy/MM/dd HH:mm'),
          endTime: DateTime.fromSQL(params.end_time).toFormat('yyyy/MM/dd HH:mm'),
        }
        const data = { ENVIRONMENT, reservation, plan }
        const subject: string = '【bacon】 新規ご予約'
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
              .htmlView('emails/reservation_create', data)
              .textView('emails/reservation_create-text', data)
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
   * 予約内容変更や日程変更
   */
  public async recreate({ request, response }) {
    let result: {
      status: number
      reservationId?: number | null
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
      plan_id?: number
      start_time?: any
      end_time?: any
      line_user_id?: number
      num_adult?: number
      num_kids?: number
      tel?: string
      linename?: string
      shop_id?: number
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
      let target = await ReservationModel.query().where('id', params.id).andWhere('flag', 1).first()
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
      const bacon = this.loadYaml(baconFilePath)

      /** start_timeとend_timeがあればその日時で予約可能か確認して、新規作成 */
      if (params.start_time && params.end_time) {
        /** 新規予約のためにplan_idとline_user_idとshop_idは必須 */
        if (!params.plan_id || !params.line_user_id || !params.shop_id) {
          return helper.frontOutput(response, {
            status: 422,
            message: 'Invalid parameter error. [plan_id, line_user_id]',
          })
        }

        const createResult = await this.creating({
          request: params,
          ENVIRONMENT,
          from: 'method',
        })

        if (createResult.status !== 200 || !createResult.reservationId) {
          return helper.frontOutput(response, createResult)
        }

        /**
         * Googleカレンダーの予定を削除
         * @ref https://developers.google.com/calendar/api/quickstart/nodejs?hl=ja
         */
        try {
          /** 既存の予約を削除 */
          const calendarDelete = await calendar.delete({
            eventId: target.event_id,
          })
          if (calendarDelete.error) {
            console.error(calendarDelete)
            return helper.frontOutput(response, {
              status: 500,
              updated: false,
              reservationId: null,
              message: 'An error occurred during calendar deletion.',
            })
          }
        } catch (error) {
          console.log(error)
          return helper.frontOutput(response, {
            status: 500,
            updated: false,
            reservationId: null,
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
          const updated = await target.save()

          result = {
            status: 200,
            reservationId: createResult.reservationId,
            updated: updated.id ? true : false,
          }
        } catch (error) {
          console.log(error)
          return helper.frontOutput(response, {
            status: 500,
            updated: false,
            reservationId: createResult.reservationId,
            message: 'An error occurred during target record deletion.',
          })
        }
      } else {
        /** start_timeとend_timeがないときは通常の更新 */
        if (params.start_time || params.end_time) {
          return helper.frontOutput(response, {
            status: 422,
            message: 'start_time or end_time must both be specified',
          })
        }

        // 現予約情報
        const targetData = target.toJSON()
        const targetPlan = bacon.plans.find(
          (plan) => Number(plan.id) === Number(targetData.plan_id)
        )

        const sum = Number(targetData.num_adult) + Number(targetData.num_kids)
        // カレンダー更新用データ
        const description = `
          名前: ${params.linename || targetData.linename}
          電話番号: ${params.tel || targetData.tel}
          人数(大人): ${params.num_adult || targetData.num_adult}
          人数(子供): ${params.num_kids || targetData.num_kids}
        `
        let calendarUpdateData = {
          summary: `【予約${targetPlan.nickname}】 ${params.linename}様：${sum}名`,
          description,
          startTime: targetData.start_time,
          endTime: targetData.end_time,
          eventId: targetData.event_id,
        }

        // 同一日程でプランだけ変更する場合(手ぶらBBQ -> 持ち込みBBQなどの変更、BBQ <-> campの変更は不可)
        if (params.plan_id) {
          const paramsPlan = bacon.plans.find((plan) => Number(plan.id) === Number(params.plan_id))
          // プランだけ変更時はカレンダータイトルも変更
          calendarUpdateData.summary = paramsPlan.label
          if (paramsPlan.type !== targetPlan.type) {
            return helper.frontOutput(response, {
              status: 403,
              message: 'Rebook if the reservation type is different.',
            })
          }
        }

        /** カレンダーを更新 */
        const calendarUpdate = await calendar.update(calendarUpdateData)
        if (calendarUpdate.error) {
          console.error(calendarUpdate.error)
          return helper.frontOutput(response, {
            status: 500,
            reservationId: null,
            updated: false,
            message: 'An error occurred during calendar update.',
          })
        }

        /** レコード更新 */
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
          reservationId: null,
          updated: updated.id ? true : false,
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
      let target = await ReservationModel.query().where('id', params.id).andWhere('flag', 1).first()
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
      const bacon = this.loadYaml(baconFilePath)
      const planData = bacon.plans.find((p) => target && p.id === target.plan_id)

      if (ENVIRONMENT.name === 'production') {
        const plan = {
          name: planData.nickname,
          startTime: DateTime.fromISO(String(target.start_time)).toFormat('yyyy/MM/dd HH:mm'),
          endTime: DateTime.fromISO(String(target.end_time)).toFormat('yyyy/MM/dd HH:mm'),
        }
        const data = { ENVIRONMENT, reservation: target, plan }
        const subject: string = '【bacon】 ご予約キャンセル'
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
              .htmlView('emails/reservation_cancel', data)
              .textView('emails/reservation_cancel-text', data)
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

    const rsvModel = new ReservationModel()
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
    const maxMonths = 3 // 3ヶ月先までの予約を取得
    const todayDT = DateTime.local().toFormat('yyyy-MM-dd')
    const plusDT = DateTime.local().plus({ months: maxMonths }).toFormat('yyyy-MM-dd')
    const days = Number(DateTime.fromSQL(plusDT).diff(DateTime.fromSQL(todayDT), 'days').days)

    interface Result {
      status: number
      empty?: any
    }
    interface Params {
      date?: string
      shop_id?: number
    }

    let params: Params = request.qs()

    let result: Result = {
      status: 200,
      empty: [],
    }

    if (params.date) {
      const checkStatus = await this.getReservesStatus({
        date: params.date,
        start_time: null,
        end_time: null,
        plan_id: null,
        shop_id: params.shop_id,
      })
      result.empty = checkStatus.courses || []
    } else {
      await Promise.all(
        [...Array(days)].map(async (_, i) => {
          const dt = DateTime.local()
            .plus({ day: i + 1 })
            .toFormat('yyyy-MM-dd')
            .toString()
          const checkStatus = await this.getReservesStatus({
            date: dt,
            start_time: null,
            end_time: null,
            plan_id: null,
            shop_id: params.shop_id,
          })
          if (checkStatus.courses.length) result.empty.push(dt)
        })
      )
    }

    helper.frontOutput(response, result)
  }

  /**
   * 予約状況を確認
   * HACK: 時間関連の処理、プラン追加及び対応時間帯の変更ごとに修正が必要
   * canReserves, planはすべての引数が必要
   */
  public async getReservesStatus({ date, start_time, end_time, plan_id, shop_id }) {
    const bacon = this.loadYaml(baconFilePath)
    let result: {
      canReserves: boolean
      courses: any
      plan: any
    } = {
      canReserves: false,
      courses: [],
      plan: {},
    }

    if (!date || !bacon) return result

    // 水曜定休
    const regularHoliday = ['Wed', '水']
    const weekday = DateTime.fromFormat(date, 'yyyy-MM-dd').weekdayShort
    if (regularHoliday.includes(weekday)) return result

    const plans = bacon.plans
    const targetPlan = plan_id ? plans.find((plan) => Number(plan.id) === Number(plan_id)) : null
    result.plan = targetPlan

    /** yamlから時間帯ごとのコース取得 */
    let courseIds: {
      camp: any
      bbqLunch: any
      bbqDinner: any
    } = {
      camp: [],
      bbqLunch: [],
      bbqDinner: [],
    }
    plans.forEach((plan) => {
      if (plan.type === 'dayCamp') {
        courseIds.camp = [...courseIds.camp, ...plan.courses.map((crs) => crs.id)]
      }
      if (plan.type === 'bbq') {
        plan.courses.forEach((crs) => {
          if (crs.start.includes('11')) courseIds.bbqLunch.push(crs.id)
          else if (crs.start.includes('17')) courseIds.bbqDinner.push(crs.id)
        })
      }
    })

    const limits = bacon.limit
    const reservesCount = {
      camp: 0,
      bbqLunch: 0,
      bbqDinner: 0,
    }

    interface Args {
      between?: any
      flags?: number[]
    }

    /** DBから対象日の予約一覧を取得 */
    const args: Args = {
      between: [`${date} 00:00:00`, `${date} 23:59:59`],
      flags: [1],
    }
    const rsvModel = new ReservationModel()
    const reserves = await rsvModel.get(args) // flag=1のみ取得
    if (reserves && reserves.data.length) {
      /**
       * 予約のplan_idからtypeを取得し、カウントする
       *   type => bbq ならrsvの予約時間に応じてlunchかdinnerに更に分類(ランチとディナーで別枠という想定)
       *   type => dayCamp ならcamp
       */
      reserves.data.forEach((rsv) => {
        const rsvData = rsv.toJSON()
        const nowPlan = plans.find((plan) => Number(plan.id) === Number(rsvData.plan_id))
        if (nowPlan && nowPlan.type === 'dayCamp') reservesCount.camp += 1
        if (nowPlan && nowPlan.type === 'bbq') {
          const rsvStart = DateTime.fromISO(rsvData.start_time)
          const rsvEnd = DateTime.fromISO(rsvData.end_time)
          if (rsvStart.hour >= 11 && rsvEnd.hour <= 15) reservesCount.bbqLunch += 1
          if (rsvStart.hour >= 17 && rsvEnd.hour <= 21) reservesCount.bbqDinner += 1
        }
      })
    }

    /** DBから祝日データを取得 */
    const holidayModel = new HolidayModel()
    const holidays = await holidayModel.get({ shop_id })
    let holidayDates: string[] = []
    if (holidays && holidays.length) {
      holidayDates = holidays.map((holi) =>
        DateTime.fromSQL(holi.holiday_at).toFormat('yyyy-MM-dd').toString()
      )
    }

    /**
     * startTime, endTime, plan_idがあれば予約可能かどうかも確認
     */
    if (start_time && end_time && plan_id) {
      // キャンプの場合
      if (targetPlan && targetPlan.type === 'dayCamp') {
        if (
          reservesCount.camp < limits.dayCamp &&
          reservesCount.bbqLunch + reservesCount.camp < limits.all &&
          reservesCount.bbqDinner + reservesCount.camp < limits.all
        ) {
          result.canReserves = true
        }
      }

      // BBQの場合
      if (
        targetPlan &&
        targetPlan.type === 'bbq' &&
        ((start_time.includes('11:00') &&
          end_time.includes('15:00') &&
          reservesCount.bbqLunch + reservesCount.camp < limits.all &&
          reservesCount.bbqLunch < limits.bbq) ||
          (start_time.includes('17:00') &&
            end_time.includes('21:00') &&
            reservesCount.bbqDinner + reservesCount.camp < limits.all &&
            reservesCount.bbqDinner < limits.bbq))
      ) {
        result.canReserves = true
      }

      // 3ヶ月以内か当日ではないか3/25以後か(予約時間がディーナータイムのときは予約日が金土かどうか)
      const todaySQL = DateTime.local().toFormat('yyyy-MM-dd').toString()
      const todayWeekday = Number(DateTime.fromSQL(date).toFormat('c').toString())
      if (
        Number(DateTime.fromSQL(date).diff(DateTime.fromSQL(todaySQL), 'days').days) > 90 ||
        DateTime.fromSQL(date) <= DateTime.fromSQL(todaySQL) ||
        DateTime.fromSQL(date) < DateTime.fromSQL('2023-03-25') ||
        (start_time.includes('17:00') &&
          end_time.includes('21:00') &&
          ![5, 6].includes(todayWeekday)) ||
        (holidayDates.length &&
          holidayDates.includes(DateTime.fromSQL(date).toFormat('yyyy-MM-dd').toString()))
      ) {
        result.canReserves = false
      }
    } else {
      result.canReserves = false
    }

    /**
     * 予約可能なコースが有るか確認
     * yamlを回して、時間帯ごとのコースに分離して、確認して返却
     */
    /** limits.allの制限確認 */
    const allCheck =
      reservesCount.bbqLunch + reservesCount.camp < limits.all &&
      reservesCount.bbqDinner + reservesCount.camp < limits.all
    /** campの制限確認 */
    if (limits.dayCamp > reservesCount.camp && allCheck) {
      result.courses = [...result.courses, ...courseIds.camp]
    }
    /** ランチとallの制限確認 */
    if (
      limits.bbq > reservesCount.bbqLunch &&
      reservesCount.bbqLunch + reservesCount.camp < limits.all
    ) {
      result.courses = [...result.courses, ...courseIds.bbqLunch]
    }
    /** ディナーとallの制限確認 */
    if (
      limits.bbq > reservesCount.bbqDinner &&
      reservesCount.bbqDinner + reservesCount.camp < limits.all
    ) {
      result.courses = [...result.courses, ...courseIds.bbqDinner]
    }

    /** 金土のみディナータイムあり */
    const todayWeekday = Number(DateTime.fromSQL(date).toFormat('c').toString())
    if (![5, 6].includes(todayWeekday)) {
      result.courses = result.courses.filter((crs) => !courseIds.bbqDinner.includes(crs))
    }

    /** 2023-03-25以前の特例予約対応 */
    if (DateTime.fromSQL(date) < DateTime.fromSQL('2023-03-25')) {
      result.courses = []
    }

    /** 90日以後の予約受け付けない */
    const todaySQL = DateTime.local().toFormat('yyyy-MM-dd').toString()
    if (Number(DateTime.fromSQL(date).diff(DateTime.fromSQL(todaySQL), 'days').days) > 90) {
      result.courses = []
    }

    /** 年末年始等休業日は予約不可 */
    if (
      holidayDates.length &&
      holidayDates.includes(DateTime.fromSQL(date).toFormat('yyyy-MM-dd').toString())
    ) {
      result.courses = []
    }

    if (date === '2025-05-03' || date === '2025-05-04' || date === '2025-05-05') {
      result.courses.includes(7) || result.courses.push(7)
    } else {
      result.courses = result.courses.filter((n) => n !== 7)
    }

    return result
  }
}
