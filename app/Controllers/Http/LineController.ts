import { DateTime } from 'luxon'
const axios = require('axios')

export default class Line {
  public async sendCreatedReservation(data: { u_id: string | null; rsvData: any; plan: any }) {
    const reservationItem = [
      {
        label: '予約日',
        name: 'date',
      },
      {
        label: 'プラン',
        name: 'plan',
      },
      {
        label: '予約人数',
        name: 'num',
      },
      {
        label: 'お名前',
        name: 'linename',
      },
      {
        label: '電話番号',
        name: 'tel',
      },
    ]

    const listContents: any = []
    reservationItem.forEach((item) => {
      const obj: {
        label: string
        value: string
      } = {
        label: item.label,
        value: '',
      }
      if (item.name === 'date') {
        obj.value = DateTime.fromSQL(data.rsvData.start_time).toFormat('yyyy/MM/dd')
      } else if (item.name === 'plan') {
        const start = DateTime.fromSQL(data.rsvData.start_time).toFormat('HH:mm')
        const course = data.plan.courses.find((c) => c.start === start)
        obj.value = `${data.plan.label}(${course.label})`
      } else if (item.name === 'num') {
        const withKids = data.plan.prices.some((p) => p.type === 'kids')
        if (withKids)
          obj.value = `大人：${data.rsvData.num_adult}名\n子供：${data.rsvData.num_kids}名`
        else obj.value = `${data.rsvData.num_adult}名`
      } else {
        obj.value = String(data.rsvData[item.name])
      }
      if (obj.value) listContents.push(obj)
    })

    const contents: any = []
    listContents.forEach((item) => {
      const labelObj: {
        text: string
        type: string
        size: string
        weight: string
        margin?: string
      } = {
        text: item.label,
        type: 'text',
        size: 'xxs',
        weight: 'bold',
      }
      const valueObj: {
        type: string
        text: string
        size: string
        margin: string
        wrap: boolean
      } = {
        text: item.value,
        type: 'text',
        size: 'sm',
        margin: 'sm',
        wrap: true,
      }
      if (contents.length) {
        contents.push({
          type: 'separator',
          color: '#aaaaaa',
          margin: 'lg',
        })
        labelObj.margin = 'lg'
      }
      if (valueObj.text) {
        contents.push(labelObj)
        contents.push(valueObj)
      }
    })

    const listObj = {
      type: 'box',
      layout: 'vertical',
      contents,
      backgroundColor: '#eeeeee',
      cornerRadius: 'sm',
      paddingAll: 'lg',
      margin: 'xl',
    }

    const template = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '予約完了',
            weight: 'bold',
          },
          listObj,
          {
            type: 'text',
            text: '※予約のキャンセルは予約日の３日前までとなります。',
            size: 'xxs',
            align: 'center',
            margin: 'lg',
          },
        ],
      },
    }

    const msgObj = {
      to: data.u_id,
      messages: [
        {
          type: 'flex',
          altText: '予約が完了しました！',
          contents: template,
        },
      ],
    }

    return await this.lineSend(msgObj)
  }

  public async sendCreatedGwReservation(data: { u_id: string | null; rsvData: any }) {
    const reservationItem = [
      {
        label: '予約日時',
        name: 'date',
      },
      {
        label: 'プラン',
        name: 'plan',
      },
      {
        label: '予約人数',
        name: 'num',
      },
      {
        label: 'お名前',
        name: 'linename',
      },
      {
        label: '電話番号',
        name: 'tel',
      },
    ]

    const listContents: any = []
    reservationItem.forEach((item) => {
      const obj: {
        label: string
        value: string
      } = {
        label: item.label,
        value: '',
      }
      if (item.name === 'date') {
        obj.value = DateTime.fromSQL(data.rsvData.reservation_date).toFormat('yyyy/MM/dd')
        obj.value = `${obj.value} ${data.rsvData.start}`
      } else if (item.name === 'plan') {
        obj.value = 'BBQ BEER GARDEN'
      } else if (item.name === 'num') {
        const sum =
          Number(data.rsvData.num_adult) +
          Number(data.rsvData.num_jr) +
          Number(data.rsvData.num_kids)
        obj.value = `${sum}名`
      } else {
        obj.value = String(data.rsvData[item.name])
      }
      if (obj.value) listContents.push(obj)
    })

    const contents: any = []
    listContents.forEach((item) => {
      const labelObj: {
        text: string
        type: string
        size: string
        weight: string
        margin?: string
      } = {
        text: item.label,
        type: 'text',
        size: 'xxs',
        weight: 'bold',
      }
      const valueObj: {
        type: string
        text: string
        size: string
        margin: string
        wrap: boolean
      } = {
        text: item.value,
        type: 'text',
        size: 'sm',
        margin: 'sm',
        wrap: true,
      }
      if (contents.length) {
        contents.push({
          type: 'separator',
          color: '#aaaaaa',
          margin: 'lg',
        })
        labelObj.margin = 'lg'
      }
      if (valueObj.text) {
        contents.push(labelObj)
        contents.push(valueObj)
      }
    })

    const listObj = {
      type: 'box',
      layout: 'vertical',
      contents,
      backgroundColor: '#eeeeee',
      cornerRadius: 'sm',
      paddingAll: 'lg',
      margin: 'xl',
    }

    const template = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '予約完了',
            weight: 'bold',
          },
          listObj,
        ],
      },
    }

    const msgObj = {
      to: data.u_id,
      messages: [
        {
          type: 'flex',
          altText: '予約が完了しました！',
          contents: template,
        },
      ],
    }

    return await this.lineSend(msgObj)
  }

  public async sendCreatedIrregularReservation(data: {
    u_id: string | null
    rsvData: any
    plan: any
  }) {
    const reservationItem = [
      {
        label: '予約日時',
        name: 'date',
      },
      {
        label: 'プラン',
        name: 'plan',
      },
      {
        label: '予約人数',
        name: 'num',
      },
      {
        label: 'お名前',
        name: 'linename',
      },
      {
        label: '電話番号',
        name: 'tel',
      },
    ]

    const listContents: any = []
    reservationItem.forEach((item) => {
      const obj: {
        label: string
        value: string
      } = {
        label: item.label,
        value: '',
      }
      if (item.name === 'date') {
        obj.value = `${DateTime.fromSQL(data.rsvData.start_time).toFormat('yyyy/MM/dd HH:mm')} ~ ${
          data.plan?.courses[0]?.end || ''
        }`
      } else if (item.name === 'plan') {
        obj.value = data.plan.label
      } else if (item.name === 'num') {
        const sum = Number(data.rsvData.num_adult) + Number(data.rsvData.num_kids)
        obj.value = `${sum}名`
      } else {
        obj.value = String(data.rsvData[item.name])
      }
      if (obj.value) listContents.push(obj)
    })

    const contents: any = []
    listContents.forEach((item) => {
      const labelObj: {
        text: string
        type: string
        size: string
        weight: string
        margin?: string
      } = {
        text: item.label,
        type: 'text',
        size: 'xxs',
        weight: 'bold',
      }
      const valueObj: {
        type: string
        text: string
        size: string
        margin: string
        wrap: boolean
      } = {
        text: item.value,
        type: 'text',
        size: 'sm',
        margin: 'sm',
        wrap: true,
      }
      if (contents.length) {
        contents.push({
          type: 'separator',
          color: '#aaaaaa',
          margin: 'lg',
        })
        labelObj.margin = 'lg'
      }
      if (valueObj.text) {
        contents.push(labelObj)
        contents.push(valueObj)
      }
    })

    const listObj = {
      type: 'box',
      layout: 'vertical',
      contents,
      backgroundColor: '#eeeeee',
      cornerRadius: 'sm',
      paddingAll: 'lg',
      margin: 'xl',
    }

    const template = {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '予約完了',
            weight: 'bold',
          },
          listObj,
        ],
      },
    }

    const msgObj = {
      to: data.u_id,
      messages: [
        {
          type: 'flex',
          altText: '予約が完了しました！',
          contents: template,
        },
      ],
    }

    return await this.lineSend(msgObj)
  }

  public async lineSend(data) {
    // return { status: 200 }
    try {
      await axios({
        method: 'POST',
        url: `https://api.line.me/v2/bot/message/push`,
        headers: {
          Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`,
        },
        data,
      })
      return true
    } catch (error) {
      return error
    }
  }
}
