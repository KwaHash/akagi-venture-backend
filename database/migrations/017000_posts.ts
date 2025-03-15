import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id').primary().notNullable()
      table.integer('flag').unsigned().notNullable().defaultTo(1)
      table.text('title').notNullable()
      table.text('content')
      table.integer('type').unsigned().notNullable().defaultTo(1)
      table.integer('site').unsigned().notNullable().defaultTo(1)
      table.integer('external_link').unsigned().notNullable().defaultTo(1)
      table.text('url')
      table.timestamp('publish_date')
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
