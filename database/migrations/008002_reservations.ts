import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'reservations'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('event_id').nullable().alter()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('event_id').notNullable().alter()
    })
  }
}
