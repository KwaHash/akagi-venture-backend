'use strict'

const fs = require('fs');
const path = require('path')
const { promisify } = require('util');
const { google } = require('googleapis');
const googleAuth = require('google-auth-library');

//promisifyでプロミス化
const readFileAsync = promisify(fs.readFile);

const TOKEN_DIR = __dirname;
const TOKEN_PATH = TOKEN_DIR + '/.credentials/calendar-nodejs-quickstart.json';

class GoogleCalendarAccessor {

  /**
   * コンストラクタ
   * @param calendarId string 操作対象のカレンダーID
   */
  constructor(calendarId) {
    this.calendarId = calendarId;
  }

  /** クレデンシャル情報の取得 */
  async getCredincials() {
    if (this.auth) {
      return this.auth;
    }

    // 認証方法の指定 serviceAccount
    // oAuthは有効期限の更新が面倒
    const authMethod = 'serviceAccount'

    if (authMethod === 'oAuth') {
      // oAuthの場合
      const content = await readFileAsync(__dirname + '/client_secret.json');
      const credentials = JSON.parse(content); //クレデンシャル

      // 認証
      const clientSecret = credentials.installed.client_secret;
      const clientId = credentials.installed.client_id;
      const redirectUrl = credentials.installed.redirect_uris[0];
      const oauth2Client = new googleAuth.OAuth2Client(clientId, clientSecret, redirectUrl);
      const token = await readFileAsync(TOKEN_PATH);
      oauth2Client.credentials = JSON.parse(token);

      this.auth = oauth2Client;
    } else if (authMethod === 'serviceAccount') {
      // サービスアカウント
      // 参考: https://dream-yt.github.io/post/spreadsheet-via-service-account/
      this.auth = await google.auth.getClient({
        keyFile: path.resolve(__dirname, `../data/credentials/${process.env.GCSAKEY}`),
        scopes: ['https://www.googleapis.com/auth/calendar'],
      })
    }

    return this.auth;
  }


  /**
  * 対象カレンダーに新規予定作成
  * @param summary 予定タイトル
  * @param description 予定説明
  * @param startTime 開始時間ISO形式
  * @param endTime 終了時間ISO形式　
  */
  async insert({ summary, description, startTime, endTime }) {
    const auth = await this.getCredincials();
    const calendar = google.calendar({ version: 'v3', auth }); // calendarAPI取得

    const event = {
      'summary': summary,
      'description': description,
      'start': {
        'dateTime': startTime,
        'timeZone': 'Asia/Tokyo',
      },
      'end': {
        'dateTime': endTime,
        'timeZone': 'Asia/Tokyo',
      },
    };

    try {
      const response = await calendar.events.insert({
        auth,
        calendarId: this.calendarId,
        resource: event,
      });

      return response;
    } catch (error) {
      return error.response;
    }
  }

  /**
  * 対象カレンダーのイベントを更新
  * @param eventId
  * @param summary 予定タイトル
  * @param description 予定説明
  * @param startTime 開始時間ISO形式
  * @param endTime 終了時間ISO形式
  */
  async update({ eventId, startTime, endTime, summary, description }) {
    const auth = await this.getCredincials();
    const calendar = google.calendar({ version: 'v3', auth }); // calendarAPI取得

    const event = {
      'summary': summary,
      'description': description,
      'start': {
        'dateTime': startTime,
        'timeZone': 'Asia/Tokyo',
      },
      'end': {
        'dateTime': endTime,
        'timeZone': 'Asia/Tokyo',
      },
    };

    try {
      const response = await calendar.events.update({
        auth,
        calendarId: this.calendarId,
        eventId,
        resource: event,
      });

      return response;
    } catch (error) {
      return error.response;
    }
  }

  /**
  * 対象カレンダーのイベントを削除
  * @param eventId
  */
  async delete({ eventId }) {
    const auth = await this.getCredincials();
    const calendar = google.calendar({ version: 'v3', auth }); // calendarAPI取得

    try {
      const response = await calendar.events.delete({
        auth,
        calendarId: this.calendarId,
        eventId,
      });

      return response;
    } catch (error) {
      return error.response;
    }
  }

  /**
  * カレンダーの予定取得
  */
  async getList() {
    const auth = await this.getCredincials();
    const calendar = google.calendar({ version: 'v3', auth }); // calendarAPI取得

    try {
      const res = await calendar.events.list({
        calendarId: this.calendarId,
      })
      return res
    } catch (error) {
      return error.response.data;
    }
  }


}

module.exports = GoogleCalendarAccessor
