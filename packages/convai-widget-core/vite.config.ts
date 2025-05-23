/// <reference types="@vitest/browser/providers/playwright" />

import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
    outDir: "dist",
    rollupOptions: {
      external: id =>
        id.startsWith("preact") ||
        id.startsWith("@preact") ||
        id.startsWith("@elevenlabs") ||
        id === "clsx",
    },
  },
  plugins: [preact()],
  test: {
    name: "ConvAI Widget Tests",
    browser: {
      provider: "playwright",
      enabled: true,
      instances: [
        {
          browser: "chromium",
          launch: {
            args: [
              "--use-fake-device-for-media-stream",
              "--use-fake-ui-for-media-stream",
            ],
          },
          context: {
            permissions: ["microphone"],
          },
        },
      ],
    },
  },
});
