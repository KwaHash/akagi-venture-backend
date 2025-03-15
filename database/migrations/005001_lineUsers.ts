import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'lineUsers'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('flag').notNullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('flag').notNullable().alter()
    })
  }
}
