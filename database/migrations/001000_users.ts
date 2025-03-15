import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary()
      table.integer('flag').unsigned().defaultTo(1)
      table.string('username', 80)
      table.string('email', 254).unique().notNullable()
      table.string('password', 80)
      table.text('activatekey')
      table.datetime('expiry')
      table.string('update_email', 254)
      table.integer('login_failed_count').unsigned().defaultTo(0)
      table.datetime('login_unbanned_at', { useTz: true })
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
