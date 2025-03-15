import EcUser from 'App/Models/EcUser'
import Point from 'App/Models/Point'
import PointsController from 'App/Controllers/Http/PointsController'
import { DateTime } from 'luxon'
import LineUser from 'App/Models/LineUser'

export default class BatchController {
  public async getEcPoints() {
    const now = DateTime.local()
    const regTime = { created_at: now, updated_at: now }

    // ecUsersリスト全取得
    const ecUserModel = new EcUser()
    const ecUserData = await ecUserModel.get({ withLineUser: 1 })
    const ecUsers = ecUserData?.data ? ecUserData.data : []
    // Promise.allで回して
    await Promise.all(
      ecUsers.map(async (ecUser) => {
        // lineUserがなければ処理しない（基本ない想定）
        if (!ecUser.lineUser.length) {
          return console.log(`LineUser not found [ec_user_id: ${ecUser.id}]`)
        }

        // ecUsers.customer_idからポイント取得（shopserve api）
        const pointController = new PointsController()
        const res = await pointController.getEcPoint(ecUser.customer_id)
        if (res.status !== 200) return
        const ecHoldingPoint = res.point
        // console.log('==== ec保有ポイント ====')
        // console.log(ecHoldingPoint)

        // ec未反映を除いてDB側の保有ポイント数を計算
        const pointModel = new Point()
        const pointData = await pointModel.get({
          line_user_id: ecUser.lineUser[0].id,
          processedStatus: 1,
        })
        const points = pointData.data ? pointData.data : []
        let dbHoldingPoint = 0
        points.forEach((p) => {
          if (p.type === 1) dbHoldingPoint += p.amount
          if (p.type === 2) dbHoldingPoint -= p.amount
        })
        // console.log('==== DB処理済ポイント ====')
        // console.log(dbHoldingPoint)

        // ecUsersと差分があれば登録
        if (dbHoldingPoint !== ecHoldingPoint && (ecHoldingPoint || ecHoldingPoint === 0)) {
          const registData = {
            flag: 1,
            is_processed: 1,
            amount: Math.abs(dbHoldingPoint - ecHoldingPoint),
            type: dbHoldingPoint < ecHoldingPoint ? 1 : 2,
            line_user_id: ecUser.lineUser[0].id,
            is_ec: 1,
            ...regTime,
          }
          // console.log('==== DB登録ポイント ====')
          // console.log(`${registData.type === 1 ? '+' : '-'}${registData.amount}`)
          pointModel.fill(registData)
          await pointModel.save()
        }
      })
    )
  }

  /**
   * DBのレコードのうち未処理のものをECへ登録
   * 対象はpoint.type=1の想定（EC側の処理ができない場合ポイントの利用はできないため）
   */
  public async registPointToEc() {
    const pointModel = new Point()
    const pointData = await pointModel.get({
      withLineUser: 1,
      withShop: 1,
      processedStatus: 2, // 未処理
    })
    const points = pointData.data ? pointData.data : []
    await Promise.all(
      points.map(async (p) => {
        const customerId = p.lineUser?.ecUser[0]?.customer_id || null
        if (customerId) {
          const data = {
            account: customerId,
            operation_point: p.type === 1 ? p.amount : p.amount * -1,
            note: p.shop?.label || '不明(LINE)',
          }
          const pointController = new PointsController()
          const res = await pointController.operationPoint(data)
          if (res.status === 200) {
            const target = await Point.find(p.id)
            if (target) {
              target.merge({
                id: p.id,
                is_processed: 1,
                updated_at: DateTime.local(),
              })
              target.save()
            }
          }
        }
      })
    )
  }

  /**
   * ポイントの有効期限確認
   */
  public async checkExpiredPoint() {
    const lineUserModel = new LineUser()
    const lineUserData = await lineUserModel.get({
      hasPoints: 1,
      withPoints: 1,
      flags: [1, 999],
    })
    const lineUsers = lineUserData.data || []
    await Promise.all(
      lineUsers.map(async (l) => {
        l.point.sort((a, b) => {
          if (a.updated_at < b.updated_at) return 1
          if (a.updated_at > b.updated_at) return -1
          else return 0
        })
        const now = DateTime.local()
        const nowFormated = now.toFormat('yyyy-MM-dd HH:mm:ss')
        const expire = DateTime.fromISO(l.point[0]?.toJSON().updated_at)
          .plus({ month: 12 })
          .toFormat('yyyy-MM-dd HH:mm:ss')

        // 期限切れのため全レコード is_expired = 1 にする
        if (nowFormated > expire) {
          await Promise.all(
            l.point.map(async (p) => {
              const target = await Point.find(p.id)
              const updateData = {
                id: p.id,
                is_expired: 1,
                updated_at: now,
              }
              await target?.merge(updateData)
              await target?.save()
            })
          )
        }
      })
    )
  }
}
