/**
 * The slice of a synchronous SQLite connection the adapter needs.
 *
 * Named after expo-sqlite's `SQLiteDatabase` methods so the real connection
 * is assignable without a wrapper, while tests wrap Node's built-in
 * `node:sqlite` in the same shape (see test/helpers/node-db.ts). Nothing in
 * `persistence/` other than expo.ts imports expo-sqlite, so the whole write
 * and replay path runs under vitest.
 */
export type SqlValue = string | number | null;

export type SqlRow = Record<string, SqlValue>;

export interface SqlDb {
  /** Run one or more statements without parameters (DDL, PRAGMA). */
  execSync(source: string): void;
  /** Run one parameterised statement that returns no rows. */
  runSync(source: string, params: SqlValue[]): unknown;
  /** Run one parameterised query and collect every row. */
  getAllSync<T extends SqlRow>(source: string, params: SqlValue[]): T[];
  /** Run `task` inside BEGIN/COMMIT; roll back if it throws. */
  withTransactionSync(task: () => void): void;
}
