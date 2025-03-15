// import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
/** ref */
import Helper from 'App/Helper'
import Mail from '@ioc:Adonis/Addons/Mail'

/** helper */
const helper = new Helper()

/** lib */
// import { DateTime } from 'luxon'

export default class ContactsController {
  /**
   * 問い合わせフォーム送信
   */
  public async sendInquiry({ request, response }) {
    let result: {
      status: number
      message?: string | null
    } = { status: 400 }

    interface Params {
      name: string
      email: string
      content: string
    }

    let params: Params
    try {
      params = JSON.parse(request.body())
    } catch {
      params = request.body()
    }

    if (!params.name || !params.email || !params.content) {
      helper.frontOutput(response, {
        status: 422,
        message: 'Invalid parameter error.',
      })
      return
    }

    try {
      // メール送信
      const ENVIRONMENT = helper.getEnvironment(request)

      const data = {
        ENVIRONMENT,
        name: params.name,
        email: params.email,
        content: params.content,
      }
      const subject: string = '【AKAGI & VENTURE PROJECT】新規お問い合わせ'
      const toEmail: string | undefined = process.env.CONTACT_EMAILTO
      const fromEmail: string | undefined = process.env.FROM_EMAIL
      const fromName: string | undefined = process.env.FROM_NAME
      const cc: string = 'tech@cicac.jp'
      if (fromEmail && fromName && toEmail) {
        await Mail.send((message) => {
          message
            .from(fromEmail, fromName)
            .to(toEmail)
            .cc(cc)
            .subject(subject)
            .htmlView('emails/inquiry', data)
            .textView('emails/inquiry-text', data)
        })
      }

      result = {
        status: 200,
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
