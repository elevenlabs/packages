// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { importX } from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/**"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    plugins: { "import-x": importX },
    settings: {
      "import-x/extensions": [".ts", ".tsx", ".js", ".jsx"],
      "import-x/resolver": {
        typescript: true,
      },
    },
    rules: {
      "import-x/no-cycle": "error",
    },
  }
);
