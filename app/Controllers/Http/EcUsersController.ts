// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import EcUser from 'App/Models/EcUser'
import LineUser from 'App/Models/LineUser'
import EcUserLineUser from 'App/Models/EcUserLineUser'
import Point from 'App/Models/Point'
import PointsController from 'App/Controllers/Http/PointsController'
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

export default class ShopsController {
  /** LINE連携 */
  public async link2LineUser({ request, response }) {
    let result: {
      status: number
      message?: string
      error?: any
    } = {
      status: 200,
    }

    interface Params {
      email: string
      u_id: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.email || !params.u_id) {
      result = {
        status: 402,
        message: 'Invalids parameter error !!',
      }
    }

    const now = DateTime.local()
    const regTime = { created_at: now, updated_at: now }

    // shopserve api から顧客検索
    const customerParams = { mail_address: params.email }
    let ecCustomer
    if (result.status === 200) {
      await axios({
        headers: {
          'Content-Type': 'application/json',
        },
        auth: {
          username: SHOPSERVE_SHOPID,
          password: SHOPSERVE_MANAGER_KEY,
        },
        method: 'POST',
        url: 'https://management.api.shopserve.jp/v2/client/_search',
        data: customerParams,
      })
        .then((response) => {
          const res = response.data
          // 該当顧客が存在する && 会員登録されている（登録なしでも購入可能かつ顧客として取得されるため）
          if (Number(res.total_count) && res.clients[0].member) {
            ecCustomer = res.clients[0]
          } else {
            result = {
              status: 404,
              message: 'Not found shopserve customer',
            }
          }
        })
        .catch((error) => {
          result = {
            status: 404,
            message: 'shopserve api error',
            error,
          }
        })
    }

    // point controller
    const pointController = new PointsController()

    // ecCustomerが取得できたらポイントapi叩く
    let ecPoint
    if (result.status === 200 && ecCustomer) {
      const ecPointRes = await pointController.getEcPoint(ecCustomer.member.account)
      if (ecPointRes.status === 200) ecPoint = ecPointRes.point
      else result = ecPointRes
    }

    // lineUsersからユーザー特定（ない場合はエラー（基本ない想定））
    const lineUserModel = new LineUser()
    const lineUser = await lineUserModel.getDetail({
      u_id: params.u_id,
      withPoints: 1,
    })
    if (!lineUser) {
      result = {
        status: 400,
        message: 'Not found lineuser',
      }
    }

    // 必要な情報が揃ったら登録処理開始
    let ecUser
    if (result.status === 200 && ecCustomer) {
      try {
        // customer_idからecUsersに登録ないか確認し登録
        const exists = await EcUser.findBy('customer_id', ecCustomer.member.account)
        if (!exists) {
          const ecUserData = {
            customer_id: ecCustomer.member.account,
            ...regTime,
          }
          const ecUserModel = new EcUser()
          ecUserModel.fill(ecUserData)
          const savedEcUser = await ecUserModel.save()
          ecUser = savedEcUser?.toJSON()
        } else {
          ecUser = exists.toJSON()
        }
      } catch (error) {
        result = {
          status: 500,
          message: 'failed to regist ecUsers',
          error,
        }
      }
    }

    // 該当のlineUserまたはecUserがすでに連携されていないか確認
    if (result.status === 200) {
      const lineUserExists = await EcUserLineUser.findBy('line_user_id', lineUser?.id)
      const ecUserExists = await EcUserLineUser.findBy('ec_user_id', ecUser.id)
      const lineUserExistsJson = lineUserExists?.toJSON()
      const ecUserExistsJson = ecUserExists?.toJSON()
      if (!lineUserExistsJson && ecUserExistsJson) {
        result = { status: 500, message: 'This ecUser is already linked to othor lineUser' }
      } else if (lineUserExistsJson && !ecUserExistsJson) {
        result = { status: 500, message: 'This lineUser is already linked to othor ecUser' }
      } else if (
        lineUserExists &&
        ecUserExists &&
        lineUserExistsJson?.ec_user_id !== ecUserExistsJson?.id
      ) {
        result = {
          status: 500,
          message: 'This ecUser and lineUser are already linked to other accounts',
        }
      } else if (
        lineUserExists &&
        ecUserExists &&
        lineUserExistsJson?.ec_user_id === ecUserExistsJson?.id
      ) {
        result = {
          status: 200,
          message: 'This user already linked',
        }
        console.log(result)
        return helper.frontOutput(response, result)
      }
    }

    if (result.status === 200) {
      try {
        // EC側の保有ポイントをDBに登録
        const pointData = {
          flag: 1,
          type: 1,
          line_user_id: lineUser?.id,
          amount: Number(ecPoint),
          is_expired: 0,
          is_processed: 1,
          is_ec: 1,
          ...regTime,
        }
        const pointModel = new Point()
        pointModel.fill(pointData)
        await pointModel.save()
      } catch (error) {
        console.log(`failed to regist points. [lineUser: ${lineUser?.id}]`)
        console.log(error)
      }
    }

    // DB側保有ポイントをec側に登録
    const env = helper.getEnvironment(request)
    // productionのみ
    const localTestFlag = 0
    if (env.name === 'production' || localTestFlag) {
      try {
        const pointModel = new Point()
        const pointData = await pointModel.get({
          line_user_id: lineUser?.id,
          processedStatus: 2,
        })
        const points = pointData.data && pointData.data.length ? pointData.data : []
        const data: {
          account: string
          operation_point: number
          note: string
        } = {
          account: ecCustomer.member.account,
          operation_point: lineUser.pointSum,
          note: 'LINE連携時加算ポイント',
        }

        const res = await pointController.operationPoint(data)

        if (res.status === 200) {
          await Promise.all(
            points.map(async (p) => {
              // apiで処理が完了したらレコードupdate
              const updateData = {
                id: p.id,
                is_processed: 1,
                updated_at: now,
              }
              const target = await Point.find(p.id)
              if (target) {
                target.merge(updateData)
                await target.save()
              }
            })
          )
        }
      } catch (error) {
        console.log(`failed to regist points. [lineUser: ${lineUser?.id}]`)
        console.log(error)
      }
    }

    // 連関テーブル登録
    if (result.status === 200 && lineUser && lineUser) {
      try {
        const elData = {
          ec_user_id: ecUser.id,
          line_user_id: lineUser.id,
        }
        const elModel = new EcUserLineUser()
        elModel.fill(elData)
        await elModel.save()
      } catch (error) {
        result = {
          status: 500,
          message: 'failed to regist ecUserLineUsers',
          error,
        }
      }
    }

    helper.frontOutput(response, result)
  }
}
