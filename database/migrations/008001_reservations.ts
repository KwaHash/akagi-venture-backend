import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'reservations'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('flag').notNullable().defaultTo(1)
      table.integer('num_adult').notNullable()
      table.integer('num_kids').notNullable()
      table.text('tel').notNullable()
      table.text('linename').notNullable()
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('flag')
      table.dropColumn('num_adult')
      table.dropColumn('num_kids')
      table.dropColumn('tel')
      table.dropColumn('linename')
    })
  }
}
