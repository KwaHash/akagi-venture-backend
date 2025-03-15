declare module '@ioc:Adonis/Lucid/Database' {
  interface DatabaseQueryBuilderContract<Result> {
    getCount(): Promise<BigInt>
  }
}
