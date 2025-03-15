// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
// import Database from '@ioc:Adonis/Lucid/Database'

import MASTER from '../../../data/master'
import Helper from 'App/Helper'
const helper = new Helper()

export default class ConnectionsController {
  public async database({ response }) {
    let result: { status: number; counts?: number | BigInt; message: string }
    try {
      // const usersCount = await Database.query().from('users').getCount()
      result = {
        status: 200,
        // counts: usersCount,
        message: 'database connected',
      }
    } catch (e) {
      result = {
        status: 500,
        message: e.message,
      }
    }
    helper.frontOutput(response, result)
  }

  /**
   * バックエンドで管理しているマスターデータ
   * フロントからhttpで取得
   */
  public async master() {
    return {
      status: 200,
      master: MASTER,
    }
  }
}
