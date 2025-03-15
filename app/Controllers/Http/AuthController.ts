// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
// import Hash from '@ioc:Adonis/Core/Hash'
import UserModel from 'App/Models/User'
import TokenModel from 'App/Models/Token'
import { DateTime } from 'luxon'
import Helper from 'App/Helper'
const helper = new Helper()

export default class AuthController {
  private attemptOption: { expiresIn: string }

  constructor() {
    this.attemptOption = {
      expiresIn: '30d',
    }
  }

  /**
   * ログイン
   */
  public async login({ auth, request, response }) {
    let result: {
      status: number
      token?: string
      message: string
      email?: string
      ban: any
    }
    interface Params {
      email: string
      password: string
    }
    interface Ban {
      [key: string]: any
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    // ログイン制限のため、emailからユーザー特定
    const userModel = new UserModel()
    const user = await userModel.getDetail({ email: params.email })

    if (!user) {
      // ユーザー未登録
      helper.frontOutput(response, {
        status: 404,
        email: params.email,
        message: 'E_USER_NOT_FOUND: login failed: user not found',
      })
      return
    } else {
      if (user.login_unbanned_at) {
        const MASTER: { [key: string]: any } = helper.master()
        const now = DateTime.local()
        const limit = DateTime.fromJSDate(user.login_unbanned_at)
        if (now.toUnixInteger() > limit.toUnixInteger()) {
          // ログイン制限解除 -> ログイン試行
          await userModel.manageBanned({ email: user.email, unbanned: true })
        } else if (user.login_failed_count >= MASTER.system.ban.count) {
          helper.frontOutput(response, {
            status: 403,
            message: `Login failed. "${user.email}" is temporarily banned.`,
            isBanned: true,
            unbannedTime: limit.toFormat('yyyy年MM月dd日 HH時mm分'),
          })
          return
        }
      }
    }

    let ban: Ban = {}
    try {
      // 不要となる古いtokenを削除
      const tokenModel = new TokenModel()
      const where: {
        foreign_id: number
        type: string
      } = {
        foreign_id: user.id,
        type: 'user',
      }
      await tokenModel.deletes({ where })

      // Create token
      const token = await auth
        .use('user')
        .attempt(params.email, params.password, this.attemptOption)

      if (user) {
        // ログイン成功 -> ログイン制限解除
        ban = await userModel.manageBanned({ email: user.email, unbanned: true })
      }

      result = {
        status: 200,
        token,
        message: 'Logged in successfully',
        ban,
      }
    } catch (error) {
      if (user) {
        // ログイン失敗カウント追加
        ban = await userModel.manageBanned({ email: user.email })
      }

      result = {
        status: 400,
        email: params.email,
        message: error.message,
        ban,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ログインチェック
   */
  public async check({ auth, response }) {
    let result: {
      status: number
      message: string
      check?: boolean
      user?: object
    }

    try {
      const check: boolean = await auth.use('user').check()
      const userId = auth.user.id || null

      /** auth.userだとpreloadedが取得できないのでgetDetailから取得 */
      let userData: any | null = null
      if (userId) {
        interface Args {
          id?: number
        }
        let args: Args = {
          id: userId,
        }
        const userModel = new UserModel()
        userData = await userModel.getDetail(args)
      }
      result = {
        status: 200,
        message: 'user authorized',
        check,
        user: userData ? userData.toJSON() : null,
      }
    } catch (e) {
      result = {
        status: 402,
        message: e.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ログアウト
   */
  public async logout({ auth, response }) {
    await auth.use('user').revoke()
    const result: {
      status: number
      message: string
    } = {
      status: 200,
      message: 'user logout & token revoked',
    }
    helper.frontOutput(response, result)
  }
}
