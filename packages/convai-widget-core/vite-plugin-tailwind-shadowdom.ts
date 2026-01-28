import type { Plugin } from 'vite';

// Patterns to strip webkit-hyphens media query conditions that cause issues in Shadow DOM
// See https://github.com/tailwindlabs/tailwindcss/issues/15005
const WEBKIT_HYPHENS_DOUBLE_PAREN = /\(\(-webkit-hyphens:\s*none\)\)\s*and\s*/g;
const WEBKIT_HYPHENS_SINGLE_PAREN = /\(-webkit-hyphens:\s*none\)\s*and\s*/g;
const ROOT_SELECTOR = /:root\b/g;
const CSS_MODULE_PATTERN = /\.css\?/;

export function tailwindFixShadowDOM(): Plugin {
  return {
    name: 'vite-plugin-tailwind-fix-shadowdom',
    enforce: 'post',
    transform(code, id) {
      if (!CSS_MODULE_PATTERN.test(id)) {
        return null;
      }

      const transformed = code
        .replace(WEBKIT_HYPHENS_DOUBLE_PAREN, '')
        .replace(WEBKIT_HYPHENS_SINGLE_PAREN, '')
        .replace(ROOT_SELECTOR, ':host');

      if (transformed !== code) {
        return {
          code: transformed,
          map: null,
        };
      }

      return null;
    },
  };
}

export default tailwindFixShadowDOM;
