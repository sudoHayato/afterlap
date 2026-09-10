import type { SqlDb } from "./sql";

/**
 * Versioned schema, append-only tables.
 *
 * `schema_version` holds a single row. Migrations run in order inside one
 * transaction each and bump that row; a fresh database starts at 0 and gets
 * every migration. Adding a column or a table later is a new entry in
 * MIGRATIONS, never an edit of an existing one.
 *
 * Two data tables, both insert-only:
 * - `events`: START / CHANGE / STOP / RECOVERED. `discarded` marks a STOP
 *   that the athlete chose to throw away — the row stays, the flag says so.
 * - `samples`: GPS fixes, one row each, at ~1 Hz. Kept apart from `events`
 *   so the hot write path is five numeric columns with no nullable text,
 *   and so the tiny events table is never scanned past thousands of fixes.
 *
 * There is no UPDATE and no DELETE anywhere in the adapter: state is always
 * a replay of these rows (see replay.ts), exactly as the engine derives
 * segments from events.
 */
export type Migration = { version: number; up: (db: SqlDb) => void };

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    up: (db) => {
      db.execSync(`
        CREATE TABLE events (
          seq        INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT    NOT NULL,
          type       TEXT    NOT NULL,
          at         INTEGER NOT NULL,
          sport      TEXT,
          discarded  INTEGER NOT NULL DEFAULT 0
        );
        CREATE INDEX events_by_session ON events(session_id, seq);
        CREATE TABLE samples (
          seq        INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT    NOT NULL,
          t          INTEGER NOT NULL,
          lat        REAL    NOT NULL,
          lng        REAL    NOT NULL,
          speed_mps  REAL    NOT NULL,
          source     TEXT    NOT NULL
        );
        CREATE INDEX samples_by_session ON samples(session_id, seq);
      `);
    },
  },
];

export const SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]!.version;

export function readSchemaVersion(db: SqlDb): number {
  db.execSync("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
  const rows = db.getAllSync<{ version: number }>("SELECT version FROM schema_version", []);
  return rows[0]?.version ?? 0;
}

/** Apply every migration above the stored version. Returns the versions crossed. */
export function migrate(db: SqlDb, migrations: readonly Migration[] = MIGRATIONS): { from: number; to: number } {
  const from = readSchemaVersion(db);
  let current = from;
  for (const m of migrations) {
    if (m.version <= current) continue;
    if (m.version !== current + 1) {
      throw new Error(`migration ${m.version} does not follow ${current}`);
    }
    db.withTransactionSync(() => {
      m.up(db);
      if (current === 0) {
        db.runSync("INSERT INTO schema_version (version) VALUES (?)", [m.version]);
      } else {
        // The one UPDATE in the adapter: the version row is metadata, not data.
        db.runSync("UPDATE schema_version SET version = ?", [m.version]);
      }
    });
    current = m.version;
  }
  return { from, to: current };
}
