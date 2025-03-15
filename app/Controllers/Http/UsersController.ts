// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Mail from '@ioc:Adonis/Addons/Mail'
import UserModel from 'App/Models/User'
import RoleModel from 'App/Models/Role'
import UserShopModel from 'App/Models/UserShop'
import { DateTime } from 'luxon'
import Helper from 'App/Helper'
const helper = new Helper()
import { nanoid } from 'nanoid'

export default class UsersController {
  /**
   * ユーザ登録
   * activateKeyを設定して認証メール送信
   */
  public async create({ request, response }) {
    let result: {
      status: number
      userID?: number
      mail?: object
      email?: string
      message?: string
    } = { status: 400 }

    interface Params {
      email: string
      flag?: number
      role?: number
      shop?: number
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.email) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      // roleデータをparamsから分離
      const newRole = params.role ? Number(params.role) : 0
      if (params.role) delete params.role
      const newShop = params.shop ? Number(params.shop) : 0
      if (params.shop) delete params.shop

      // 登録済みであるかの確認
      let target = await UserModel.findBy('email', params.email)

      if (target) {
        // 登録済みの場合は即返却
        const user = target.toJSON()
        helper.frontOutput(response, {
          status: 200,
          exists: true,
          userID: user.id,
        })
        return
      }

      const now = DateTime.local()
      const time = { created_at: now, updated_at: now }
      const data = {
        activatekey: nanoid(28), // メール認証のためのアクティベートキー
        ...params,
        ...time,
      }

      // ユーザー登録
      let userModel = new UserModel()
      // postされたデータをfillして
      userModel.fill(data)
      // 登録
      await userModel.save()

      // roleが存在すれば登録
      if (newRole) {
        const roleData = {
          user_id: Number(userModel.id),
          role: newRole,
          ...time,
        }
        const roleModel = new RoleModel()
        roleModel.fill(roleData)
        await roleModel.save()
      }

      // shopが存在すれば連関登録
      if (newShop) {
        const shopRelationData = {
          user_id: Number(userModel.id),
          shop_id: newShop,
          ...time,
        }
        const userShopModel = new UserShopModel()
        userShopModel.fill(shopRelationData)
        await userShopModel.save()
      }

      const user = userModel.toJSON()

      // メール送信
      const ENVIRONMENT = helper.getEnvironment(request)
      const obj = {
        ENVIRONMENT,
        user,
        linkBaseURL: request.headers() ? request.headers().referer : '',
      }
      const fromEmail: string | undefined = process.env.FROM_EMAIL
      const fromName: string | undefined = process.env.FROM_NAME

      if (fromEmail && fromName) {
        const mail = await Mail.send((message) => {
          message
            .from(fromEmail, fromName)
            .to(obj.user.email)
            .subject(`【${ENVIRONMENT.projectname}】会員登録ありがとうございます`)
            .htmlView('emails/user_create', obj)
            .textView('emails/user_create-text', obj)
        })
        result = {
          status: 200,
          userID: userModel.id,
          mail: mail.envelope,
        }
      }
    } catch (error) {
      result = {
        status: 500,
        email: params.email,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * パスワード登録
   */
  public async createPassword({ request, response }) {
    let result: {
      status: number
      user?: object
      registed?: boolean
      email?: string
      message?: string
    }

    interface Params {
      flag: number
      password: string
      activatekey: string
    }

    interface UpdateData {
      id: number
      flag: number
      password: string
      activatekey: any
      updated_at: DateTime
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.password || !params.activatekey) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    // activatekeyを元にユーザを特定
    const user = await UserModel.findBy('activatekey', params.activatekey)

    if (!user) {
      // ユーザが見つからない場合
      helper.frontOutput(response, {
        status: 404,
        message: 'user not exists',
      })
      return
    }

    try {
      const now = DateTime.local()
      const updateData: UpdateData = {
        id: user.id,
        flag: params.flag,
        password: params.password,
        activatekey: null, // 認証済みなのでnull
        updated_at: now,
      }

      // user情報更新
      await user.merge(updateData).save()
      result = {
        status: 200,
        user,
        registed: true,
      }
    } catch (error) {
      const email: string = user.email
      result = {
        status: 401,
        email,
        message: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * ユーザー更新
   */
  public async update({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      id: number
      flag?: number
      username?: string
      email?: string
      shop?: number
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
      let target = await UserModel.find(params.id)

      if (!target) {
        // 登録されていなければ返却
        helper.frontOutput(response, {
          status: 404,
          message: 'User not found.',
        })
        return
      }

      const udtShop = params.shop ? Number(params.shop) : 0
      if (params.shop) delete params.shop

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

      // shopが存在すれば連関登録
      if (udtShop) {
        const shopRelationData: {
          id?: number
          user_id: number
          shop_id: number
          created_at?: DateTime
          updated_at: DateTime
        } = {
          user_id: Number(params.id),
          shop_id: udtShop,
          ...time,
        }

        // 登録があるか確認
        const target = await UserShopModel.findBy('user_id', params.id)

        if (target) {
          const targetRelation = target.toJSON()
          shopRelationData.id = targetRelation.id // targetのidを格納
          if (shopRelationData.created_at) delete shopRelationData.created_at // created_atは不要なので削除
          // mergeして保存
          target.merge(shopRelationData)
          await target.save()
        } else {
          const userShopModel = new UserShopModel()
          userShopModel.fill(shopRelationData)
          await userShopModel.save()
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
   * ユーザリスト取得
   */
  public async list({ request, response }) {
    interface Result {
      status: number
      list?: object
    }
    interface Params {
      flags?: string // getで渡ってくるためstring
      role?: number[]
    }
    interface Args {
      flags?: number[]
      role?: number[]
    }

    let params: Params = request.qs()
    let args: Args = {}
    // stringで渡ってきたflagsを配列にパース
    if (params.flags) args.flags = JSON.parse(params.flags)
    if (params.role)
      args.role = params.role.map((r) => {
        return Number(r)
      })

    const userModel = new UserModel()
    const users = await userModel.get(args)

    let result: Result = {
      status: 200,
      list: users,
    }

    helper.frontOutput(response, result)
  }

  /**
   * ユーザ詳細取得
   */
  public async detail({ request, response }) {
    interface Result {
      status: number
      detail: object | null
    }
    interface Params {
      id?: string // getで渡ってくるためstring
      flags?: string // getで渡ってくるためstring
      email?: string
    }
    interface Args {
      id?: number // 引数ではnumber
      flags?: number[] // 引数では配列
      email?: string
    }

    let params: Params = request.qs()
    let args: Args = {}
    // stringで渡ってきたparmasをパース
    if (params.id) args.id = Number(params.id)
    if (params.flags) args.flags = JSON.parse(params.flags)
    if (params.email) args.email = params.email

    const userModel = new UserModel()
    const user = await userModel.getDetail(args)

    let result: Result = {
      status: 200,
      detail: user,
    }

    helper.frontOutput(response, result)
  }

  /**
   * パスワードリセットのためのメール送信
   * @param request
   */
  public async forgotPassword({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      mail?: string | null
      detail?: object | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      email?: string
    }
    interface UpdateData {
      id: number
      expiry: DateTime
      activatekey: string
      updated_at: DateTime
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.email) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    const email = params.email
    try {
      const activatekey = nanoid(28)
      const now = DateTime.local()
      const tomorrow = DateTime.local().plus({ days: 1 })

      // user情報更新
      const user = await UserModel.findBy('email', email)
      if (!user) {
        helper.frontOutput(response, {
          status: 404,
          message: `not found user ${email}`,
        })
        return
      }
      // expiryとactivateKeyは登録時・リセット時にnull
      const updateData: UpdateData = {
        id: user.id,
        expiry: tomorrow,
        activatekey,
        updated_at: now,
      }

      // user情報更新
      const updated = await user.merge(updateData).save()

      // メール送信
      const ENVIRONMENT = helper.getEnvironment(request)
      const args = {
        email: user.email,
        updateData,
        ENVIRONMENT,
        tomorrow,
      }

      const fromEmail: string | undefined = process.env.FROM_EMAIL
      const fromName: string | undefined = process.env.FROM_NAME

      if (fromEmail && fromName) {
        const mail = await Mail.send((message) => {
          message
            .from(fromEmail, fromName)
            .to(args.email)
            .subject(`【${ENVIRONMENT.projectname}】パスワード再設定手続きのご案内`)
            .htmlView('emails/forgot_password', args)
            .textView('emails/forgot_password-text', args)
        })
        result = {
          status: 200,
          mail,
          updated: updated ? true : false,
        }
      }
    } catch (error) {
      result = {
        status: 401,
        message: 'failed send reset password mail',
        detail: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * パスワードリセット
   * @param request
   */
  public async resetPassword({ request, response }) {
    let result: {
      status: number
      updated?: boolean | null
      expired?: boolean | null
      mail?: string | null
      detail?: object | null
      message?: string | null
    } = { status: 400 }

    interface Params {
      activatekey?: string
      password?: string
    }
    interface UpdateData {
      id: number
      password: string
      expiry?: DateTime | null
      activatekey?: string | null
      updated_at: DateTime
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.activatekey || !params.password) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      // user情報更新
      const user = await UserModel.findBy('activatekey', params.activatekey)
      if (!user) {
        helper.frontOutput(response, {
          status: 404,
          message: `user not exist`,
        })
        return
      }

      const expiry = DateTime.fromISO(user.toJSON().expiry)
      const now = DateTime.local()

      if (expiry > now) {
        // expiryとactivateKeyは登録時・リセット時にnull
        const updateData: UpdateData = {
          id: user.id,
          password: params.password,
          expiry: null,
          activatekey: null,
          updated_at: now,
        }

        // user情報更新
        const updated = await user.merge(updateData).save()

        // メール送信
        const ENVIRONMENT = helper.getEnvironment(request)
        const args = {
          email: user.email,
          ENVIRONMENT,
        }

        const fromEmail: string | undefined = process.env.FROM_EMAIL
        const fromName: string | undefined = process.env.FROM_NAME

        if (fromEmail && fromName) {
          const mail = await Mail.send((message) => {
            message
              .from(fromEmail, fromName)
              .to(args.email)
              .subject(`【${ENVIRONMENT.projectname}】パスワード再設定完了のお知らせ`)
              .htmlView('emails/update_password', args)
              .textView('emails/update_password-text', args)
          })
          result = {
            status: 200,
            mail,
            updated: updated ? true : false,
          }
        }
      } else {
        result = {
          status: 401,
          message: 'expired password reset',
          expired: true,
        }
      }
    } catch (error) {
      result = {
        status: 401,
        message: 'failed send reset password mail',
        detail: error.message,
      }
    }
    helper.frontOutput(response, result)
  }
}
