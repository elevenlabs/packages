# ESLint Configuration - Quick Start

## 🎯 Overview

The agents-cli now has a comprehensive ESLint configuration specifically designed for **CLI tools built with Ink, React, and TypeScript**.

## 📦 What's Included

### Plugins
- ✅ **ESLint 9** - Modern flat config format
- ✅ **TypeScript ESLint 8** - Type-aware linting
- ✅ **React Plugin** - React/JSX rules for Ink components
- ✅ **React Hooks Plugin** - Hook validation (critical for Ink)

### Configuration
- ✅ Separate rules for `.ts` and `.tsx` files
- ✅ Relaxed rules for test files
- ✅ CLI-specific allowances (`console.log`, `process.exit`)
- ✅ Node.js globals configured
- ✅ React 19 support

## 🚀 Quick Commands

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format

# Check types
npm run typecheck
```

## 📊 Current Status

- **Total Issues**: 72 (2 errors, 70 warnings)
- **Auto-fixable**: ~20 issues
- **TypeScript**: ✅ Passes cleanly

## 📚 Documentation

| File | Purpose |
|------|---------|
| `eslint.config.js` | Main configuration |
| `LINTING.md` | Comprehensive guide (20+ examples) |
| `SETUP_SUMMARY.md` | Setup details and next steps |
| `.eslintrc.quick-reference.md` | Common fixes cheat sheet |

## 🔧 Common Fixes

### Import Types
```typescript
// ❌ import { Type } from './types'
// ✅ import type { Type } from './types'
```

### Unused Variables
```typescript
// ❌ const [value, setValue] = useState('')
// ✅ const [value, _setValue] = useState('')
```

### JSX Entities
```tsx
// ❌ <Text>Don't</Text>
// ✅ <Text>Don&apos;t</Text>
```

## 🎨 Rule Sets

### TypeScript Files (`.ts`)
- Type-aware linting
- Import validation
- Unused variable warnings
- No explicit `any` warnings
- CLI-specific rules

### React/TSX Files (`.tsx`)
- All TypeScript rules
- React component validation
- Hooks dependency checking
- JSX syntax rules
- Ink-specific optimizations

### Test Files
- Relaxed rules for flexibility
- Jest globals configured
- Auto-detects test patterns

## 🚦 Next Steps

### Immediate (Recommended)
1. Run `npm run lint:fix` to auto-fix ~20 issues
2. Review the 2 errors and fix manually
3. Gradually address warnings

### Optional (Production-Ready)
1. Add pre-commit hooks (husky + lint-staged)
2. Integrate into CI/CD pipeline
3. Enable format checking in CI

## 💡 Pro Tips

1. **VS Code**: ESLint extension shows errors inline
2. **Disable a line**: `// eslint-disable-next-line rule-name`
3. **Check rule docs**: Visit typescript-eslint.io
4. **Gradual adoption**: Turn warnings to `off` if needed

## 🔗 Resources

- [ESLint Docs](https://eslint.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [React Plugin](https://github.com/jsx-eslint/eslint-plugin-react)
- [Ink Docs](https://github.com/vadimdemedes/ink)

---

**Ready to use!** Run `npm run lint` to get started.