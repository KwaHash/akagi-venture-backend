import Helper from 'App/Helper'
import S3 from 'App/Controllers/Http/AWS/s3'
import { Base64 } from 'js-base64'
import { Blob } from 'buffer'
const helper = new Helper()

export default class MediasController {
  /**
   * メディアアップロード
   */
  public async upload({ request, response }) {
    let result: {
      status: number
      resultData?: {
        original: {
          status: number
          message?: string | null
        }
      }
      message?: string | null
      detail?: string | null
    } = { status: 400 }

    interface Params {
      environment: string
      title?: string | null // 通常タイトルを入れるが入っていなけばその日の日付を入れる format:YYYY-MM-DD
      file?: string | null
      filename?: string | null
      alt?: string
    }

    let params: Params = request.qs()

    if (!params.environment) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      const file = request.file('file')
      file.clientName = params.filename // 保存時の名前を定義
      const upload = {
        environment: params.environment,
        model: 'ImageLibrary',
        type: params.title,
        file,
      }

      const s3 = new S3()
      const uploaded = await s3.uploadFile({ upload })

      let resultData: {
        original: {
          status: number
          message?: string | null
          created?: object | null
          uploaded?: object | null
        }
        uploaded?: object | null
        filename: string
      } = {
        original: {
          status: 500,
        },
        uploaded,
        filename: file.clientName,
      }

      if (uploaded.status === 200) {
        resultData.original = {
          status: 200,
          message: `successful upload image. file: ${file.clientName}`,
          uploaded,
        }
      } else {
        // S3クラスにアクセスしたけど画像の登録に失敗
        resultData.original = {
          status: uploaded.status,
          message: uploaded.message,
        }
      }

      result = {
        status: resultData.original.status,
        resultData,
      }
    } catch (error) {
      result = {
        status: 500,
        message: 'failed upload image',
        detail: error.message,
      }
    }
    helper.frontOutput(response, result)
  }

  public async base64ToBlob(base64) {
    const textData = base64.replace('data:image/png;base64,', '')
    const bytes = Base64.decode(textData)
    const array = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
      array[i] = bytes.charCodeAt(i)
    }
    const blob = new Blob([array], { type: 'iamge/png' })

    return blob
  }
}
