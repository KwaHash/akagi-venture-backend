import MASTER from '../../data/master'
import { DateTime } from 'luxon'
// logはLoggerでなくpm2のログ出力に変更
// import Logger from '@ioc:Adonis/Core/Logger'

export default class Helper {
  /**
   * フロントへの返却関数
   * @param response レスポンス
   * @param result   返却するオブジェクト
   */
  public frontOutput(response, result) {
    const ENV: string | undefined = process.env.NODE_ENV
    if (!response) {
      return result
    } else {
      if (result.status === 200) {
        if (ENV !== 'production') console.log('[ front output success ]')
        response.send(result)
      } else {
        // それ以外は返却失敗
        if (ENV !== 'production') console.log('[ front output failed ]')
        console.log(`[ ${DateTime.local().toFormat('yyyy-LL-dd TT')} ]`)
        console.log(result)
        // フロント返却
        response.status(result.status).send(result)
      }
    }
    if (ENV !== 'production' || (ENV === 'production' && result.status !== 200)) {
      console.log('--------------------')
    }
  }

  /**
   * 環境変数のDB名から
   * 実行環境を返却
   */
  public getEnvironment(request) {
    const hostname: string = request.hostname()
    const isLocal: boolean = hostname === 'localhost' || hostname === 'backend'
    const header = request ? request.headers() : null
    const ENVIRONMENT = {
      name: isLocal ? 'local' : process.env.NODE_ENV,
      projectname: process.env.PNAME,
      baseURL: header.origin,
    }
    return ENVIRONMENT
  }

  /**
   * バックエンド内部で使用するためのマスター返却
   */
  public master() {
    return MASTER
  }
}

module.exports = Helper
