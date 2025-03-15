import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'points'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('shop_id')
      table.integer('shop_id').unsigned().references('id').inTable('shops').nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign('shop_id')
      table.integer('shop_id').unsigned().references('id').inTable('shops').notNullable().alter()
    })
  }
}
