function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T extends Record<string, unknown>>(
  ...objects: Partial<T>[]
): T {
  return objects.reduce<T>((acc, obj) => {
    const result = { ...acc };
    for (const key of Object.keys(obj) as Array<keyof T>) {
      const accVal = result[key];
      const objVal = obj[key];
      if (isPlainObject(accVal) && isPlainObject(objVal)) {
        result[key] = deepMerge(accVal, objVal) as T[keyof T];
      } else if (typeof accVal === "function" && typeof objVal === "function") {
        result[key] = ((...args: unknown[]) => {
          accVal(...args);
          objVal(...args);
        }) as T[keyof T];
      } else if (objVal !== undefined) {
        result[key] = objVal as T[keyof T];
      }
    }
    return result;
  }, {} as T);
}

/**
 * Merges multiple partial option objects into one.
 *
 * - Plain objects are deep-merged so that later configs can override
 *   individual nested fields without wiping unrelated ones.
 * - Functions sharing the same key are composed: all are called in
 *   order (earliest config first) with the same arguments.
 * - All other values are shallow-merged (last value wins).
 */
export function mergeOptions<T extends Record<string, unknown>>(
  ...configs: Array<Partial<T>>
): T {
  return deepMerge<T>(...configs);
}
