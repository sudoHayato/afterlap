import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { openDatabaseSync } from "expo-sqlite";
import { RAW_LOG_NAME } from "./gps/rawLog";
import { DATABASE_NAME } from "./persistence/expo";
import { getStore } from "./store";

/**
 * Export from inside the app (session 06): a consistent single-file copy of
 * the database — and the raw GPS log when a development build has one —
 * handed to the system share sheet. No `adb`, no `run-as`, no swapping a
 * debug APK over the release one to read app-private files.
 *
 * The copy is made with `VACUUM INTO`, which snapshots the database into one
 * file from a read transaction: the WAL is folded in, nothing is locked for
 * long, and the store's own connection is not touched. Expo exposes no
 * external files directory, so the copies live in the app's cache and leave
 * through the share sheet (Drive, e-mail, "save to Files", …).
 */
export const EXPORT_DIR_NAME = "export";

/** `bricklap-20260911-1432.db` — sortable, no user data in the name. */
export function exportFileName(base: string, ext: string, now: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `${base}-${stamp}.${ext}`;
}

/** Path without the `file://` scheme, as SQL wants it. */
function fsPath(file: File): string {
  return decodeURI(file.uri.replace(/^file:\/\//, ""));
}

/**
 * Copies and shares. Resolves with the names of the files offered to the
 * share sheet, once the sheet has been dismissed. Throws if the snapshot or
 * the sheet fails; the caller shows the message.
 */
export async function exportData(now = new Date()): Promise<string[]> {
  if (!(await Sharing.isAvailableAsync())) throw new Error("sharing unavailable");
  getStore().flush();

  const out = new Directory(Paths.cache, EXPORT_DIR_NAME);
  out.create({ idempotent: true, intermediates: true });
  const shared: string[] = [];

  const dbCopy = new File(out, exportFileName("bricklap", "db", now));
  if (dbCopy.exists) dbCopy.delete();
  const db = openDatabaseSync(DATABASE_NAME);
  try {
    // A second connection on purpose: the store's connection stays exactly
    // as it is. Single quotes in the path are impossible (it is ours).
    db.execSync(`VACUUM INTO '${fsPath(dbCopy)}'`);
  } finally {
    db.closeSync();
  }
  await Sharing.shareAsync(dbCopy.uri, { mimeType: "application/vnd.sqlite3", dialogTitle: dbCopy.name });
  shared.push(dbCopy.name);

  const raw = new File(Paths.document, RAW_LOG_NAME);
  if (raw.exists) {
    const rawCopy = new File(out, exportFileName("gps-raw", "jsonl", now));
    if (rawCopy.exists) rawCopy.delete();
    raw.copySync(rawCopy);
    await Sharing.shareAsync(rawCopy.uri, { mimeType: "application/json", dialogTitle: rawCopy.name });
    shared.push(rawCopy.name);
  }
  return shared;
}
