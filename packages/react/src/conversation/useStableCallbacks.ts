import { useMemo, useRef } from "react";
import type { Callbacks } from "@elevenlabs/client";
import { CALLBACK_KEYS } from "@elevenlabs/client/internal";
import type { HookOptions } from "./types";

/**
 * Wraps user-provided callback props in stable ref-backed functions,
 * preventing stale closure bugs when the session outlives renders.
 *
 * Returns a `Partial<Callbacks>` containing only the keys the caller
 * actually provided. Function references are stable per key across
 * renders, but always invoke the latest prop value. The returned object
 * reference is stable as long as the set of provided keys doesn't change.
 */
export function useStableCallbacks(props: HookOptions): Partial<Callbacks> {
  // Store the latest prop value for each callback in a ref.
  // Uses Record<string, unknown> to avoid TypeScript's union-to-intersection
  // issue when indexing Callbacks with a union of all its keys.
  const callbackRefs = useRef<Record<string, unknown>>({});
  for (const key of CALLBACK_KEYS) {
    callbackRefs.current[key] = props[key];
  }

  // Compute a stable scalar from the set of provided keys so we can
  // memoize the result object.
  const activeKeys = CALLBACK_KEYS.filter(key => props[key] !== undefined);

  return useMemo(
    () =>
      Object.fromEntries(
        activeKeys.map(key => [
          key,
          (...args: unknown[]) => {
            const fn = callbackRefs.current[key] as
              | ((...a: unknown[]) => void)
              | undefined;
            fn?.(...args);
          },
        ])
      ) as Partial<Callbacks>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- joined string is a stable scalar derived from activeKeys
    [activeKeys.join("|")]
  );
}
