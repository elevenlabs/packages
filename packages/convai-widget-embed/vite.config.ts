import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      name: "ConvaiWidgetEmbed",
      entry: "src/index.ts",
      fileName: () => "index.js",
      formats: ["iife"],
    },
    outDir: "dist",
  },
});
