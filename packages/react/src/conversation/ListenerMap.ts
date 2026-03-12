import { ListenerSet } from "./ListenerSet";

function assertFunction(
  value: unknown,
  key: string
): asserts value is (...args: unknown[]) => void {
  if (typeof value !== "function") {
    throw new Error(`Expected function for key "${key}", got ${typeof value}`);
  }
}

/**
 * A map of named listener sets. Each key maps to a `ListenerSet` that can have
 * multiple listeners registered. Typed through `T` so that `register` and
 * `compose` preserve per-key callback signatures.
 *
 * All keys are pre-initialized in the constructor so `register` can validate
 * keys. `compose()` only includes keys with at least one registered listener,
 * preserving callback-presence semantics used by the client as feature guards.
 * Composed functions delegate to the live listener set, so listeners
 * added/removed after `compose()` is called still take effect.
 */
export class ListenerMap<
  T extends Record<string, ((...args: never[]) => void) | undefined>,
> {
  private sets = new Map<string, ListenerSet<unknown[]>>();

  constructor(keys: readonly (keyof T & string)[]) {
    for (const key of keys) {
      this.sets.set(key, new ListenerSet<unknown[]>());
    }
  }

  /**
   * Register listeners for one or more keys. Returns a function that removes
   * all listeners added by this call.
   */
  register(callbacks: Partial<T>): () => void {
    const removers = Object.entries(callbacks)
      .filter(([, fn]) => fn !== undefined)
      .map(([key, fn]) => {
        assertFunction(fn, key);
        const set = this.sets.get(key);
        if (!set) {
          throw new Error(`Unknown callback key "${key}"`);
        }
        return set.add(fn);
      });
    return () => {
      for (const remove of removers) remove();
    };
  }

  /**
   * Compose all registered listeners into a single callbacks object. Each
   * composed function delegates to the live listener set, so listeners
   * added/removed after this call still take effect.
   */
  compose(): Partial<T> {
    return Object.fromEntries(
      Array.from(this.sets.entries())
        .filter(([, set]) => set.size > 0)
        .map(([key, set]) => [
          key,
          (...args: never[]) => {
            set.invoke(...args);
          },
        ])
    ) as Partial<T>;
  }
}
