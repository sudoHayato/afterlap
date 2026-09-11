import { File, Paths } from "expo-file-system";

/**
 * An append-only JSON-lines file in the app's document directory, kept for
 * the current session and the one before, **only in development builds**.
 * Every method is a no-op in a release build and never throws into the
 * recording path (a diagnostics file must not cost a sample).
 *
 * Rotation per session: `rotate()` at session start moves the current file
 * to `prevName` (replacing the one before), so at most two sessions of lines
 * live on disk. Used by the raw GPS log (`gps-raw.jsonl`, ADR 0007/0009) and
 * the background-recording diagnostics (`bg-diag.jsonl`, ADR 0010).
 */
export class DevJsonlLog {
  private file: File | null = null;

  constructor(
    readonly name: string,
    readonly prevName: string,
    private readonly tag: string,
  ) {}

  rotate(): void {
    if (!__DEV__) return;
    try {
      const current = new File(Paths.document, this.name);
      this.file = null;
      if (!current.exists) return;
      const previous = new File(Paths.document, this.prevName);
      if (previous.exists) previous.delete();
      current.moveSync(previous);
    } catch (e) {
      console.warn(this.tag, e);
    }
  }

  append(line: unknown): void {
    if (!__DEV__) return;
    try {
      this.file ??= new File(Paths.document, this.name);
      if (!this.file.exists) this.file.create();
      const handle = this.file.open();
      handle.offset = handle.size ?? 0;
      handle.writeBytes(new TextEncoder().encode(JSON.stringify(line) + "\n"));
      handle.close();
    } catch (e) {
      console.warn(this.tag, e);
    }
  }
}
