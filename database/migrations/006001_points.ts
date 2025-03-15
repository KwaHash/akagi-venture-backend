import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'points'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('line_users_id') // 外部制約を削除
      table.dropColumn('line_users_id')
      table.integer('line_user_id').unsigned().references('id').inTable('lineUsers').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('line_user_id') // 外部制約を削除
      table.dropColumn('line_user_id')
      table.integer('line_users_id').unsigned().references('id').inTable('lineUsers').nullable()
    })
  }
}
