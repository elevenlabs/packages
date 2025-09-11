import { config as baseConfig } from "./base.js";

/**
 * ESLint configuration for Node.js CLI applications.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const nodeConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
        global: "readonly",
        module: "readonly",
        require: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setImmediate: "readonly",
        clearImmediate: "readonly",
      },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
        test: "readonly",
        vi: "readonly", // for vitest
      },
    },
  },
];
