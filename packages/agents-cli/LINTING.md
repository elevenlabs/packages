# ESLint Configuration for Agents CLI

This document describes the ESLint setup for the `@elevenlabs/agents-cli` package, which is a CLI tool built with Ink (React for CLIs) and TypeScript.

## Overview

The linting configuration is specifically tailored for a CLI application using:
- **Ink** (React for CLI interfaces)
- **React 19** with JSX
- **TypeScript 5**
- **Node.js** runtime

## Configuration Files

- `eslint.config.js` - ESLint 9 flat config format (includes ignores)
- `package.json` - Contains linting scripts and dependencies

> **Note**: ESLint 9 uses the flat config format with an `ignores` property instead of `.eslintignore` files.

## ESLint Plugins

### Core Plugins

1. **@eslint/js** - JavaScript recommended rules
2. **typescript-eslint** - TypeScript support and type-aware linting
3. **eslint-plugin-react** - React/JSX specific rules
4. **eslint-plugin-react-hooks** - React Hooks rules (critical for Ink components)

## Rule Sets

### 1. TypeScript Files (`.ts`)

**Applies to**: `src/**/*.ts`

**Key Rules**:
- ✅ `@typescript-eslint/no-unused-vars`: Warns on unused variables (allows `_` prefix for intentionally unused vars)
- ✅ `@typescript-eslint/consistent-type-imports`: Enforces `import type` for type-only imports
- ⚠️ `@typescript-eslint/no-explicit-any`: Warns when using `any` type
- ⚠️ `@typescript-eslint/no-non-null-assertion`: Warns on non-null assertions (`!`)
- ❌ `no-console`: Disabled (CLI tools need console output)
- ❌ `no-process-exit`: Disabled (CLI tools need process.exit)

### 2. React/TSX Files (`.tsx`)

**Applies to**: `src/**/*.tsx`

**Key Rules**:
- **TypeScript Rules**: Same as above
- **React Rules**:
  - ✅ `react/jsx-key`: Error on missing keys in lists
  - ✅ `react/jsx-no-duplicate-props`: Error on duplicate props
  - ✅ `react/jsx-no-undef`: Error on undefined components
  - ⚠️ `react/no-unescaped-entities`: Warns on unescaped quotes/apostrophes
  - ❌ `react/react-in-jsx-scope`: Disabled (not needed in React 17+)
  - ❌ `react/prop-types`: Disabled (using TypeScript instead)
- **React Hooks Rules**:
  - ✅ `react-hooks/rules-of-hooks`: Error on incorrect Hook usage
  - ⚠️ `react-hooks/exhaustive-deps`: Warns on missing effect dependencies

### 3. Test Files (`.test.ts`, `.test.tsx`)

**Applies to**: `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/__tests__/**/*`

**Key Features**:
- Relaxed rules for test files
- Jest globals automatically recognized
- Most warnings disabled to allow flexible test code

## CLI-Specific Considerations

### Enabled for CLI Use

- ✅ `console.log()` and other console methods
- ✅ `process.exit()`
- ✅ `require()` for dynamic imports (though `import()` is preferred)
- ✅ Node.js globals (`Buffer`, `__dirname`, etc.)

### Node.js Globals Configured

```javascript
console, process, setTimeout, clearTimeout, setInterval, clearInterval,
NodeJS, require, __dirname, __filename, Buffer, global, React
```

## Running the Linter

```bash
# Lint all source files
npm run lint

# Lint and auto-fix issues
npm run lint -- --fix

# Format code with Prettier
npm run format
```

## Common Issues and Solutions

### Issue: Missing Type Imports

**Problem**: Import only used for types should use `import type`

```typescript
// ❌ Bad
import { AgentConfig } from './types';

// ✅ Good  
import type { AgentConfig } from './types';
```

### Issue: React Hooks Dependencies

**Problem**: useEffect/useCallback missing dependencies

```typescript
// ❌ Bad
useEffect(() => {
  doSomething(value);
}, []); // Missing 'value' dependency

// ✅ Good
useEffect(() => {
  doSomething(value);
}, [value]);
```

### Issue: Unescaped Entities in JSX

**Problem**: Quotes and apostrophes in JSX text

```tsx
// ❌ Bad
<Text>Don't use raw quotes</Text>

// ✅ Good
<Text>Don&apos;t use raw quotes</Text>
// or
<Text>{"Don't use raw quotes"}</Text>
```

### Issue: Unused Variables

**Problem**: Variables defined but never used

```typescript
// ❌ Bad
const [value, setValue] = useState('');

// ✅ Good (if setValue is truly unused)
const [value, _setValue] = useState('');
// or remove it entirely
const [value] = useState('');
```

### Issue: prefer-const

**Problem**: Variable never reassigned should use `const`

```typescript
// ❌ Bad
let result = await fetchData();

// ✅ Good
const result = await fetchData();
```

## Integration with TypeScript

The linter uses TypeScript's type information for enhanced checking:

- Type-aware rules are enabled via `projectService: true`
- Automatically finds and uses `tsconfig.json`
- Provides deeper analysis beyond syntax checking

## Ignored Files

The following are ignored by ESLint (configured in `eslint.config.js`):

- `dist/**` - Build output
- `node_modules/**` - Dependencies
- `coverage/**` - Test coverage reports
- `bin/**` - Shell scripts
- `*.config.js`, `*.config.cjs` - Config files
- `**/*.d.ts` - TypeScript declaration files
- `**/*.js.map` - Source maps
- `jest-environment.cjs` - Jest environment config

## Best Practices for This CLI

1. **Always use TypeScript types** - Avoid `any` where possible
2. **Follow React Hooks rules strictly** - Ink relies on proper Hook usage
3. **Use `import type` for types** - Improves build performance
4. **Handle errors gracefully** - Use proper error handling in CLI commands
5. **Keep console output** - It's needed for CLI functionality
6. **Test your components** - Use the relaxed test file rules for flexibility

## Maintenance

### Updating Rules

Edit `eslint.config.js` and adjust the `rules` object for each file pattern.

### Adding New Patterns

Add new configuration objects to the exported array:

```javascript
export default [
  // ... existing configs
  {
    files: ['src/custom/**/*.ts'],
    rules: {
      // custom rules
    }
  }
];
```

### Version Compatibility

- **ESLint**: 9.x
- **TypeScript ESLint**: 8.x
- **React Plugin**: 7.37+
- **React Hooks Plugin**: 5.1+

These versions are required for ESLint 9 compatibility.

## Resources

- [ESLint Docs](https://eslint.org/docs/latest/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react)
- [Ink Documentation](https://github.com/vadimdemedes/ink)