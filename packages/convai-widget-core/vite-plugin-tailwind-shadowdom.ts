import type { Plugin } from "vite";

/**
 * Vite plugin to normalize Tailwind CSS for Shadow DOM usage.

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

      const transformed = code
        // Replace the problematic @supports blocks with a transparent @media all wrapper.
        // Unconditionally applies the fallback variables without needing complex brace parsing.
        .replace(
          /@supports\s+[^{]*(?:-webkit-hyphens|margin-trim|-moz-orient)[^{]*\{/g,
          "@media all {"
        )
        // Convert :root to :host for Shadow DOM scoping
        .replace(/:root\b/g, ":host");

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
