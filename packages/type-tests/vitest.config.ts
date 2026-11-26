import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Each case builds a full TypeScript program over the published declarations.
    testTimeout: 60_000,
  },
});
