'use strict'
// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import ApiUserModel from 'App/Models/ApiUser'
import { DateTime } from 'luxon'
import Helper from 'App/Helper'
const helper = new Helper()

export default class ApiUsersController {
  public async create({ auth, request, response }) {
    let result: { status: number; token?: string; message?: string }
    interface Params {
      username: string
      password: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    const now = DateTime.local()
    const time = { created_at: now, updated_at: now }
    const data = {
      ...params,
      ...time,
      type: 'bearer',
    }

    // 登録済みであるかの確認
    const user = await ApiUserModel.findBy('username', params.username)

    if (user) {
      // 登録済みの場合はエラーを返却
      return {
        status: 400,
        message: 'user is already exists',
      }
    } else {
      // 未登録の場合はnullが返る
      try {
        const apiUserModel = new ApiUserModel()
        // postされたデータをfillして新規登録
        apiUserModel.fill(data)
        await apiUserModel.save()

        // usernameとpasswordを元にapi_tokenを生成
        const token = await auth.use('api').attempt(data.username, data.password)

        // api_user（アプリケーション）に持たせる
        // Bearerトークンを念の為api_usersに保存
        apiUserModel.token = token.token
        apiUserModel.type = token.type
        apiUserModel.updatedAt = now
        await apiUserModel.save()
        result = {
          status: 200,
          message: 'successed to regist api user',
          token,
        }
      } catch (error) {
        result = {
          status: 400,
          message: error.message,
        }
      }
    }
    helper.frontOutput(response, result)
  }
}
