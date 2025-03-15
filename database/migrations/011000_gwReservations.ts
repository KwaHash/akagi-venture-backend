import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'gwReservations'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('flag').notNullable().defaultTo(1)
      table.text('event_id').nullable()
      table.integer('line_user_id').unsigned().references('id').inTable('lineUsers').notNullable()
      table.text('tel').notNullable()
      table.text('linename').notNullable()
      table.date('reservation_date').notNullable()
      table.integer('num_adult').notNullable()
      table.integer('num_jr').notNullable()
      table.integer('num_kids').notNullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
