import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'points'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('flag').notNullable()
      table.integer('type').notNullable()
      table.integer('line_users_id').unsigned().references('id').inTable('lineUsers').nullable()
      table.integer('amount').notNullable()
      table.text('activatekey').nullable()
      table.datetime('expire').nullable()
      table.integer('shop_id').unsigned().references('id').inTable('shops').nullable()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
