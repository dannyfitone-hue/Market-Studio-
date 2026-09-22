import { neon } from "@neondatabase/serverless";
type Value = string | number | boolean | null;
type Row = Record<string, unknown>;
export function getSql() {
  if (!process.env.DATABASE_URL) throw new Error("Database connection is not configured");
  return neon(process.env.DATABASE_URL);
}
class Statement {
  constructor(readonly text: string, readonly values: Value[] = []) {}
  bind(...values: Value[]) { return new Statement(this.text, values); }
  query() { let n=0; return this.text.replace(/\?/g, () => `$${++n}`); }
  execute() { return getSql().query(this.query(), this.values); }
  async all<T = Row>() { return { results: (await this.execute()) as T[] }; }
  async first<T = Row>(): Promise<T | null> { return (await this.all<T>()).results[0] ?? null; }
  async run() { await this.execute(); return { success: true }; }
}
export const database = {
  prepare(text: string) { return new Statement(text); },
  async batch(statements: Statement[]) {
    const sql=getSql();
    return sql.transaction(statements.map(s=>sql.query(s.query(),s.values)));
  },
};
