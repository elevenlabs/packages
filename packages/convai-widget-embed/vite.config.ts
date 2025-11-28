import { defineConfig } from "vite";
import analyzer from "vite-bundle-analyzer";

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
  plugins: [...(process.env.ANALYZE ? [analyzer()] : [])],
});
