/// <reference types="@vitest/browser/providers/playwright" />

import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";
import analyzer from "vite-bundle-analyzer";

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
        id.startsWith("react-markdown") ||
        id.startsWith("shiki") ||
        id.startsWith("@shikijs") ||
        id.startsWith("lucide-react") ||
        id.startsWith("marked") ||
        id === "clsx" ||
        id === "tailwind-merge" ||
        id === "streamdown",
    },
  },
  plugins: [preact(), ...(process.env.ANALYZE ? [analyzer()] : [])],
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
