import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // Global ignores (must be first)
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      '*.config.js',
      '*.config.cjs',
      'jest-environment.cjs',
      'bin/**',
      '**/*.d.ts',
      '**/*.js.map',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // TypeScript files (non-React)
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
      }],
      'no-console': 'off', // CLI tools need console
      'no-process-exit': 'off', // CLI tools need process.exit
    },
  },
  // React/TSX files (Ink components)
  {
    files: ['src/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      // TypeScript rules
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
      }],
      
      // React rules
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      'react/react-in-jsx-scope': 'off', // Not needed in modern React
      'react/prop-types': 'off', // Using TypeScript
      'react/display-name': 'off',
      'react/jsx-uses-react': 'off', // Not needed in React 17+
      'react/jsx-uses-vars': 'error',
      'react/jsx-key': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-undef': 'error',
      'react/no-children-prop': 'warn',
      'react/no-unescaped-entities': 'warn',
      
      // React Hooks rules (important for Ink components)
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // CLI-specific
      'no-console': 'off',
      'no-process-exit': 'off',
    },
  },
  // Test files
  {
    files: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'src/**/__tests__/**/*.ts', 'src/**/__tests__/**/*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        projectService: true,
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'no-console': 'off',
    },
  },
];