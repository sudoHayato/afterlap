import { describe, expect, it } from "vitest";
import { seedSessions } from "@bricklap/engine";
import { LEGACY_STORAGE_KEY, loadFrom, parsePersisted, STORAGE_KEY, type StorageLike } from "./store";

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { dump: () => Record<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    dump: () => Object.fromEntries(map),
  };
}

const seeded = JSON.stringify({ sessions: seedSessions(), seeded: true });
const oneSession = JSON.stringify({ sessions: [seedSessions()[0]], seeded: true });

describe("parsePersisted", () => {
  it("accepts a well-formed payload", () => {
    expect(parsePersisted(seeded)?.sessions).toHaveLength(2);
    expect(parsePersisted(seeded)?.seeded).toBe(true);
  });

  it("rejects null, invalid JSON, non-arrays and an unseeded empty list", () => {
    expect(parsePersisted(null)).toBeNull();
    expect(parsePersisted("")).toBeNull();
    expect(parsePersisted("{not json")).toBeNull();
    expect(parsePersisted(JSON.stringify({ sessions: "nope" }))).toBeNull();
    expect(parsePersisted(JSON.stringify(null))).toBeNull();
    expect(parsePersisted(JSON.stringify({ sessions: [] }))).toBeNull();
    expect(parsePersisted(JSON.stringify({ sessions: [], seeded: false }))).toBeNull();
  });

  it("keeps an empty list once seeded (the athlete deleted everything)", () => {
    expect(parsePersisted(JSON.stringify({ sessions: [], seeded: true }))).toEqual({ sessions: [], seeded: true });
  });
});

describe("loadFrom — migração afterlap.v1 → bricklap.v1", () => {
  it("new key absent, legacy valid: adopts it, persists under the new key, removes the legacy key", () => {
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: oneSession });
    const loaded = loadFrom(storage);
    expect(loaded?.sessions).toHaveLength(1);
    expect(storage.dump()).toEqual({ [STORAGE_KEY]: oneSession });
  });

  it("both keys present: the new key wins and the legacy key is cleaned up", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: seeded, [LEGACY_STORAGE_KEY]: oneSession });
    expect(loadFrom(storage)?.sessions).toHaveLength(2);
    expect(storage.dump()).toEqual({ [STORAGE_KEY]: seeded });
  });

  it("new key corrupt, legacy valid: the legacy data is adopted over the corrupt payload", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{corrupt", [LEGACY_STORAGE_KEY]: oneSession });
    expect(loadFrom(storage)?.sessions).toHaveLength(1);
    expect(storage.dump()).toEqual({ [STORAGE_KEY]: oneSession });
  });

  it("legacy invalid: nothing is adopted and nothing throws", () => {
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: "{corrupt" });
    expect(loadFrom(storage)).toBeNull();
    expect(storage.dump()).toEqual({ [LEGACY_STORAGE_KEY]: "{corrupt" });
  });

  it("nothing stored: null", () => {
    expect(loadFrom(memoryStorage())).toBeNull();
  });

  it("a storage that throws is treated as empty", () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(loadFrom(broken)).toBeNull();
  });
});
