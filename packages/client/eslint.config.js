// @ts-check

import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";

export default defineConfig(
  globalIgnores(["dist/**"]),
  {
    plugins: { import: importPlugin },
    settings: {
      "import/extensions": [".ts", ".tsx", ".js", ".jsx"],
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "import/no-cycle": "error",
    },
  }
);
