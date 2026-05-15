import { defineConfig } from "rolldown";

export default defineConfig({
  input: "src/index.ts",
  output: {
    format: "iife",
    name: "ElevenLabsReact",
    file: "dist/lib.iife.js",
    sourcemap: true,
    globals: {
      react: "React",
      "react-dom": "ReactDOM",
      "@elevenlabs/client": "ElevenLabsClient",
      "@elevenlabs/client/internal": "ElevenLabsClientInternal",
    },
  },
  external: ["react", "react-dom", "@elevenlabs/client", "@elevenlabs/client/internal"],
});
