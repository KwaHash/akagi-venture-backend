import Drive from '@ioc:Adonis/Core/Drive'
import Application from '@ioc:Adonis/Core/Application'

const bucketName = 'akagi-venture'

export default class S3 {
  /** 接続テスト */
  public async accessTest() {
    // 同名の画像があるか確認
    const exists = await Drive.use('s3').exists('hogehoge.png')
    return exists
  }

  /**
   * @param upload obj
   *   model: アップロードするディレクトリトップ（model名）
   *   id:    user等のid
   *   type:  用途名
   *   file:  アップロードファイルのバイナリデータ
   */
  public async uploadFile({ upload }) {
    try {
      // 保存パス
      let path: string = `${upload.environment}/${upload.model}`

      if (upload.id) path += `/${upload.id}`
      if (upload.type) path += `/${upload.type}`
      if (upload.foreign_id) path += `/${upload.foreign_id}`

      // 保存時に必要な画像のオリジナルデータ抽出
      const contentType = upload.file.type
      let filename = upload.file.clientName
      let originFilename = filename // 元画像削除用にfilenameを保持

      // バイナリデータ取得のための一時保存
      await upload.file.move(Application.tmpPath(path), {
        name: filename,
        overwrite: true,
      })

      // 一時保存が正常に完了したかのチェック
      if (upload.file.state !== 'moved') {
        return {
          status: 500,
          message: 'failed upload file moved',
          detail: upload.file.error(),
        }
      }

      // 画像のバイナリデータ取得
      const binary = await Drive.get(`${path}/${filename}`)

      // リサイズ画像の場合はファイル名から-resizedを削除
      if (upload.isRemoveResizedLabel) {
        filename = filename.replace(/-resized/g, '')
      }

      // ファイル名と拡張子を分離
      const filenameArray = filename.split('.')
      const name = filenameArray[0]
      const ext = filenameArray[1]

      // 同名の画像があるか確認
      const exists = await Drive.use('s3').exists(`${path}/${filename}`)

      // 同名ファイルが存在する場合はfilenameを変更
      if (exists) {
        // 6桁のランダム文字列
        const random = Math.random().toString(36).slice(-6)
        // ランダム文字列と結合
        filename = `${name}_${random}.${ext}`
      }

      // S3への保存
      let s3FilePath = `${path}/${filename}`
      console.log(s3FilePath)
      /**
       * filenameにスペースが有ればエンコードする
       *   MEMO:
       *     frontではencodeされているURLは自動でdecodeされるらしい
       *     なのでS3ではスペース有りのファイル名のままで、DBに保存されるURLをencodeする
       *     逆ではS3:encodeでDB:そのままだとnot foundになる
       */
      if (/\s/.test(filename)) {
        const filename2EncodeArray = filename.split('.')
        const name2Encode = filename2EncodeArray[0]
        const ext2Encode = filename2EncodeArray[1]
        s3FilePath = `${path}/${encodeURIComponent(name2Encode)}.${ext2Encode}`
      }

      await Drive.use('s3').put(`${path}/${filename}`, Buffer.from(binary), {
        ContentType: contentType,
      })

      const s3Path = `https://${bucketName}.s3.amazonaws.com/${s3FilePath}`

      // 一時保存データの削除
      await Drive.delete(`${path}/${originFilename}`)

      return {
        status: 200,
        message: 's3 uploaded!',
        s3Path,
      }
    } catch (error) {
      return {
        message: 's3 upload error!!!',
        detail: error.message,
        status: 400,
      }
    }
  }
}

module.exports = S3
