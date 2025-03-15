import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'tokens'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('foreign_id').unsigned().notNullable()
      table.string('name', 80).notNullable()
      table.string('type', 80).notNullable()
      table.string('token', 255).notNullable().unique().index()
      table.timestamp('created_at', { useTz: true })
      table.timestamp('expires_at', { useTz: true }).nullable()
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
