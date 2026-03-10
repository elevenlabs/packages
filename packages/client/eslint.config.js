// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import importX from "eslint-plugin-import-x";

export default defineConfig(
  globalIgnores(["dist/**"]),
  {
    plugins: { "import-x": /** @type {any} */ (importX) },
    rules: {
      "import-x/no-cycle": "error",
    },
  }
);
