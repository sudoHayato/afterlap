import { defineConfig } from "vitest/config";

/**
 * The on-device recovery test. Kept out of the root config on purpose: it
 * needs a phone on adb and Metro reachable from it, and takes minutes.
 * Run with `npm run test:device -w @bricklap/mobile`.
 */
export default defineConfig({
  test: {
    include: ["device/**/*.device.test.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
