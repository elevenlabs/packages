// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/**", "scripts/**", "worklets/**"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
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
      // Pre-existing issues — enable incrementally
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": "off",
      "preserve-caught-error": "off",
    },
  }
);
