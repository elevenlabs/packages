import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  output: {
    format: "iife",
    name: "ElevenLabsClient",
    file: "dist/lib.iife.js",
    sourcemap: true,
    globals: {
      react: "React",
      "react-dom": "ReactDOM",
    },
  },
  external: ["react", "react-dom"],
});
