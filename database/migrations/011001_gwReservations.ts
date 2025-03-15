import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'gwReservations'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('course').nullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('course')
    })
  }
}
