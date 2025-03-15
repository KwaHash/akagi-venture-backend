import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'reservations'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.text('event_id').notNullable()
      table.integer('line_user_id').unsigned().references('id').inTable('lineUsers').notNullable()
      table.integer('plan_id').notNullable()
      table.datetime('start_time').notNullable()
      table.datetime('end_time').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
