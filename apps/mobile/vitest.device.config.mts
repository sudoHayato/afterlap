import { defineConfig } from "vitest/config";

/**
 * The on-device tests. Kept out of the root config on purpose: they need a
 * phone on adb and take minutes. `npm run test:device -w @bricklap/mobile`
 * runs the recovery test (dev client + Metro, simulator);
 * `npm run test:device:background` the background-recording test (debuggable
 * release build, real GPS). See each file's header.
 */
export default defineConfig({
  test: {
    include: ["device/**/*.device.test.ts"],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
