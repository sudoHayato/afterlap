import { DatabaseSync } from "node:sqlite";
import type { SqlDb, SqlRow, SqlValue } from "../../persistence/sql";

/**
 * Node's built-in SQLite behind the adapter's `SqlDb` shape. Same engine as
 * the phone (SQLite), no extra dependency: this is how the write and replay
 * path runs under vitest, and how the recovery test opens a database pulled
 * off the device.
 */
export type NodeDb = SqlDb & { raw: DatabaseSync };

export function openNodeDb(path = ":memory:"): NodeDb {
  const raw = new DatabaseSync(path);
  return {
    raw,
    execSync: (source) => raw.exec(source),
    runSync: (source, params) => raw.prepare(source).run(...params),
    getAllSync: <T extends SqlRow>(source: string, params: SqlValue[]) =>
      raw.prepare(source).all(...params) as T[],
    withTransactionSync: (task) => {
      raw.exec("BEGIN");
      try {
        task();
        raw.exec("COMMIT");
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
