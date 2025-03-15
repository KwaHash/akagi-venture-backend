// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import Helper from 'App/Helper'

/** helper */
const helper = new Helper()

/** lib */
// import { DateTime } from 'luxon'
const axios = require('axios')

export default class ShopserveController {
  /**
   * shopserveからアイテム取得
   */
  public async getItems({ response }) {
    let result: {
      status: number
      list?: any
      message?: string | null
    } = { status: 400 }

    try {
      const items: any = []
      const data = {
        // size: 9, // 取得件数
        size: 8, // 取得件数
        sort: {
          type: 'ItemPrice', // 商品価格降順
          // type: 'CreateDate', // 商品登録日降順
          // type: 'StockQuantity', // 在庫数降順
          order: 'Desc',
        },
        filters: [
          {
            stock_status: [
              'EnoughInStock', // 在庫がある
            ],
            is_open: 'Yes', // 公開商品
          },
        ],
      }

      await axios({
        method: 'POST',
        url: `https://management.api.shopserve.jp/v2/items/_search`,
        auth: {
          username: process.env.SHOPSERVE_SHOPID,
          password: process.env.SHOPSERVE_MANAGER_KEY,
        },
        data,
      })
        .then((response: any) => {
          const res = response.data
          if (res && res.contents && res.contents.length) {
            res.contents.forEach((item) => {
              item.image_url = `https://image1.shopserve.jp/hutte-hayashi.com/pic-labo/llimg/${item.main_image_name}`
              items.push(item)
            })
          }
        })
        .catch((error: any) => {
          if (error.response) console.log(error.response.data)
          else console.log(error)
        })

      result = {
        status: 200,
        list: items,
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
