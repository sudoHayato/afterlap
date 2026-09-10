import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "packages/*/test/**/*.test.ts",
      "apps/web-lab/src/**/*.test.ts",
      "apps/mobile/test/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts", "apps/mobile/persistence/**/*.ts"],
      // expo.ts only opens the native database; it cannot run under Node.
      exclude: ["**/*.test.ts", "**/index.ts", "apps/mobile/persistence/expo.ts"],
      reporter: ["text", "html"],
      reportsDirectory: "coverage",
    },
  },
});
