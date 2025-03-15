import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'points'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('is_processed').notNullable().defaultTo(0)
      table.integer('is_expired').notNullable().defaultTo(0)
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_processed')
      table.dropColumn('is_expired')
    })
  }
}
