import PostModel from 'App/Models/Post'
import { DateTime } from 'luxon'
import Helper from 'App/Helper'

const helper = new Helper()

export default class Post {
  public async regist({ request, response }) {
    let result: {
      status: number
      post?: object
      message?: any
    } = { status: 400 }

    interface Params {
      flag?: number
      slug: string
      title: string
      content?: string
      type: number
      site: number
      external_link: number
      url: string
      publish_date?: DateTime
    }

    let params: Params = request.body()

    if (!params.title || !params.type || !params.site) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error',
      })
      return
    }

    try {
      const now = DateTime.local()
      const time = { created_at: now, updated_at: now }
      const data = {
        ...params,
        ...time,
      }

      let postModel = new PostModel()
      postModel.fill(data)
      await postModel.save()

      result = {
        status: 200,
        post: postModel,
      }
    } catch (err) {
      if (err.message) console.log(err.message)
      else {
        console.log(err)
        result = {
          status: 500,
          message: 'Internal server error',
        }
      }
    }

    helper.frontOutput(response, result)
  }

  public async update({ request, response }) {
    let result: {
      status: number
      post?: object
      message?: any
    } = { status: 400 }

    interface Params {
      id: number
      flag?: number
      title: string
      content: string
      type: number
      site: number
      external_link: number
      url: string
      publish_date?: DateTime
    }

    let params: Params

    try {
      params = request.body()
    } catch (e) {
      console.log(e)
      result = {
        status: 400,
        message: 'Invalid params format',
      }
      helper.frontOutput(response, result)
      return
    }

    if (!params.id) {
      helper.frontOutput(response, {
        status: 422,
        message: 'ID is a required field',
      })
      return
    }

    // 指定IDが存在しているかを確認
    let target = await PostModel.find(params.id)

    if (!target) {
      // 登録されていなければ返却
      helper.frontOutput(response, {
        status: 404,
        message: 'Specified ID was not found',
      })
      return
    }

    try {
      const now = DateTime.local()
      const time = { updated_at: now }
      const updateData = {
        ...params,
        ...time,
      }

      target.merge(updateData)
      // 更新
      const updated = await target.save()

      result = {
        status: 200,
        post: updated,
      }
    } catch (error) {
      if (error.message) console.log(error.message)
      else console.log(error)
    }

    helper.frontOutput(response, result)
  }

  public async getlist({ request, response }) {
    interface Result {
      status: number
      list?: object
      message?: any
    }
    // 全て文字列で渡ってくるのでのちにパースが必要
    interface Params {
      flags?: string[]
      type?: string[]
      site?: string[]
      limit?: number
      page?: number
    }
    interface Args {
      flags?: number[]
      type?: number[]
      site?: number[]
      limit?: number
      page?: number
    }

    let params: Params = request.qs()
    let args: Args = {}
    let result: Result

    try {
      if (params.flags) args.flags = params.flags.map((elem) => Number(elem))
      if (params.type) args.type = params.type.map((elem) => Number(elem))
      if (params.site) args.site = params.site.map((elem) => Number(elem))
      if (params.limit) args.limit = params.limit
      if (params.page) args.page = params.page

      const postModel = new PostModel()
      const posts = await postModel.getlist(args)
      result = {
        status: 200,
        list: posts,
      }
    } catch (err) {
      console.log(err)
      result = {
        status: 500,
        message: err,
      }
    }

    helper.frontOutput(response, result)
  }

  public async getdetail({ request, response }) {
    interface Result {
      status: number
      data?: object
      message?: any
    }
    interface Params {
      id?: string[]
      slug?: string
      flags?: string[]
      type?: string[]
      site?: string[]
    }
    interface Args {
      id?: number[]
      slug?: string
      flags?: number[]
      type?: number[]
      site?: number[]
    }

    let params: Params = request.qs()
    let result: Result

    if (!params.slug) {
      result = {
        status: 422,
        message: 'Required slug is missing',
      }

      helper.frontOutput(response, result)
    }

    let args: Args = {
      slug: params.slug,
    }

    try {
      if (params.id) args.id = params.id.map((elem) => Number(elem))
      if (params.flags) args.flags = params.flags.map((elem) => Number(elem))
      if (params.type) args.type = params.type.map((elem) => Number(elem))
      if (params.site) args.site = params.site.map((elem) => Number(elem))

      const postModel = new PostModel()
      const data = await postModel.getdetail(args)
      result = {
        status: 200,
        data,
      }
    } catch (err) {
      console.log(err)
      result = {
        status: 500,
        message: err,
      }
    }

    helper.frontOutput(response, result)
  }
}
