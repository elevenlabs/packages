// @ts-check

import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["dist/**", "scripts/**", "worklets/**"]),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    settings: {
      "import/extensions": [".ts", ".tsx", ".js", ".jsx"],
      "import/resolver": {
        typescript: true,
      },
    },
    rules: {
      "import/no-cycle": "error",
      // Pre-existing issues — enable incrementally
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-empty": "off",
      "preserve-caught-error": "off",
    },
  }
);
