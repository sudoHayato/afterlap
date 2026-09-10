import { openDatabaseSync } from "expo-sqlite";
import { SqliteSessionStore, type RepositoryOptions } from "./repository";
import type { SqlDb } from "./sql";

/** File name under the app's files/SQLite directory. Quoted by the device test. */
export const DATABASE_NAME = "bricklap.db";

/**
 * WAL so a reader (the boot-time replay) never blocks a writer and a hard
 * kill leaves committed transactions intact; synchronous=FULL so "committed"
 * also survives power loss, not only a killed process. The cost of FULL is
 * measured on the device — see the session 03 report.
 */
export function openExpoDb(): SqlDb {
  const db = openDatabaseSync(DATABASE_NAME);
  db.execSync("PRAGMA journal_mode = WAL");
  db.execSync("PRAGMA synchronous = FULL");
  return db;
}

export function openSessionStore(options?: RepositoryOptions): SqliteSessionStore {
  return new SqliteSessionStore(openExpoDb(), options);
}
