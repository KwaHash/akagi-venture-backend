import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'holidays'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('flag').notNullable().defaultTo(1)
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('flag')
    })
  }
}
