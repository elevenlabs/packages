import type { Plugin } from "vite";

/**
 * Vite plugin to normalize Tailwind CSS for Shadow DOM usage.
 *
 * Fixes:
 * - Unwraps @supports blocks used by Tailwind's @property fallback layer,
 *   so fallback CSS variables apply unconditionally inside Shadow DOM
 * - Converts `:root` to `:host` for proper Shadow DOM scoping
 *
 * Based on https://github.com/Alletkla/vite-plugin-tailwind-shadowdom
 * @see https://github.com/tailwindlabs/tailwindcss/issues/15005
 */
export function tailwindFixShadowDOM(): Plugin {
  return {
    name: "vite-plugin-tailwind-fix-shadowdom",
    enforce: "post",

    transform(code, id) {
      if (!id.includes(".css?")) {
        return null;
      }

      let transformed = code;

      // Unwrap @supports blocks that contain Tailwind's property fallback patterns.
      // Tailwind wraps fallback variable declarations in @supports conditions that
      // detect @property support. These conditions can fail inside Shadow DOM,
      // preventing --tw-* variables from being initialized.
      // The specific condition text changes across Tailwind versions (e.g. -webkit-hyphens
      // in v4.0, margin-trim/-moz-orient in v4.1+), so we match broadly on any
      // @supports block and unwrap it, keeping its inner content.
      const supportsPattern = /@supports\s+[^{]*\{/g;

      const matches: Array<{
        start: number;
        end: number;
        contentStart: number;
        contentEnd: number;
      }> = [];

      let match = supportsPattern.exec(transformed);
      while (match !== null) {
        const contentStart = match.index + match[0].length;
        let braceCount = 1;
        let i = contentStart;
        while (i < transformed.length && braceCount > 0) {
          if (transformed[i] === "{") braceCount++;
          if (transformed[i] === "}") {
            braceCount--;
            if (braceCount === 0) {
              matches.push({
                start: match.index,
                end: i + 1,
                contentStart,
                contentEnd: i,
              });
              break;
            }
          }
          i++;
        }
        match = supportsPattern.exec(transformed);
      }

      if (matches.length > 0) {
        let result = "";
        let lastIndex = 0;
        for (const m of matches) {
          result += transformed.substring(lastIndex, m.start);
          result += transformed.substring(m.contentStart, m.contentEnd);
          lastIndex = m.end;
        }
        result += transformed.substring(lastIndex);
        transformed = result;
      }

      // Convert :root to :host for Shadow DOM scoping
      transformed = transformed.replace(/:root\b/g, ":host");

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
