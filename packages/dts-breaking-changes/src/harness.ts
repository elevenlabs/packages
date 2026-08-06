/**
 * Code-generates the in-memory TypeScript harness whose semantic diagnostics
 * encode breaking-change findings.
 *
 * The two built `.d.ts` trees are imported under distinct module aliases
 * (`@@old` / `@@new`) wired through `compilerOptions.paths`, so structurally
 * identical trees stay nominally separate. Each surface is routed through
 * `MethodsToProperties` and then compared with plain assignment statements:
 * a failed assignment is exactly a `TS2322` whose message chain carries the
 * offending property path.
 */

export const OLD_ALIAS = "@@old";
export const NEW_ALIAS = "@@new";

/** A generated assignment check, tracked by source span for diagnostic attribution. */
export interface HarnessCheck {
  direction: "consumer" | "forward";
  /** Top-level export symbol this check localizes, or "" for the whole module. */
  symbol: string;
  start: number;
  end: number;
}

export interface Harness {
  fileName: string;
  text: string;
  checks: HarnessCheck[];
}

/**
 * `MethodsToProperties`: reconstructs method/callable signatures as function
 * types so tsc checks their parameters contravariantly instead of bivariantly
 * (an identity mapped type preserves the method-bivariance flag — the signature
 * must be rebuilt via `infer` to strip it). Being a homomorphic mapped type over
 * `keyof T`, it only sees public keys, dropping `private`/`protected` members.
 * Depth-bounded. Overloads are preserved up to three signatures (most-arity-first
 * so a genuine overload set isn't flattened to a single signature); constructors
 * transform their instance type while preserving construct params positionally.
 */
const PRELUDE = `
type __Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
type __Primitive = string | number | boolean | bigint | symbol | null | undefined;
type __MtoP<T, D extends number> =
  [D] extends [0] ? T :
  T extends __Primitive ? T :
  T extends abstract new (...a: infer NA) => infer I
    ? (new (...a: NA) => __MtoP<I, __Prev[D]>) & { [K in keyof T]: __MtoP<T[K], __Prev[D]> }
    :
  T extends { (...a: infer A1): infer R1; (...a: infer A2): infer R2; (...a: infer A3): infer R3 }
    ? { (...a: A1): __MtoP<R1, __Prev[D]>; (...a: A2): __MtoP<R2, __Prev[D]>; (...a: A3): __MtoP<R3, __Prev[D]> }
    :
  T extends { (...a: infer A1): infer R1; (...a: infer A2): infer R2 }
    ? { (...a: A1): __MtoP<R1, __Prev[D]>; (...a: A2): __MtoP<R2, __Prev[D]> }
    :
  T extends (...a: infer A) => infer R ? (...a: A) => __MtoP<R, __Prev[D]> :
  T extends Promise<infer U> ? Promise<__MtoP<U, __Prev[D]>> :
  T extends object ? { [K in keyof T]: __MtoP<T[K], __Prev[D]> } :
  T;
`;

function buildFileName(dir: string): string {
  return `${dir.replace(/[/\\]+$/, "")}/__dts_breaking_changes_harness__.ts`;
}

/**
 * Which surface to compare:
 * - `value`: the value namespace (`typeof import()`) — classes, functions,
 *   consts, enums, namespaces, and every type reachable through them. Variance
 *   is principled here (params contravariant, returns covariant).
 * - `type`: pure type-only exports (interfaces / type aliases) referenced by
 *   name in type space. Opt-in, since a bare type's variance is ambiguous (a
 *   consumer may implement OR receive it).
 */
export type Space = "value" | "type";

export interface BuildHarnessOptions {
  /** Directory the harness virtual file is anchored in (for lib resolution). */
  anchorDir: string;
  transformDepth: number;
  space: Space;
  /**
   * Symbols to check. For `value` space, an empty list means the whole-module
   * fast gate (Pass 1). For `type` space, symbols are required (no aggregate).
   */
  symbols?: string[];
  /** Which directions to emit checks for. */
  directions: Array<"consumer" | "forward">;
}

export function buildHarness(opts: BuildHarnessOptions): Harness {
  const { anchorDir, transformDepth, space, symbols, directions } = opts;
  const checks: HarnessCheck[] = [];
  const d = transformDepth;

  // `srcType(symbol)` / `tgtType(symbol)` yield the transformed old/new type
  // expression for a symbol, differing only in how each space names it.
  let text: string;
  let oldType: (symbol: string) => string;
  let newType: (symbol: string) => string;
  if (space === "value") {
    text =
      PRELUDE +
      `\ntype __OldMod = typeof import(${JSON.stringify(OLD_ALIAS)});\n` +
      `type __NewMod = typeof import(${JSON.stringify(NEW_ALIAS)});\n` +
      `type __Old = __MtoP<__OldMod, ${d}>;\n` +
      `type __New = __MtoP<__NewMod, ${d}>;\n\n`;
    const index = (s: string) => (s === "" ? "" : `[${JSON.stringify(s)}]`);
    oldType = s => `__Old${index(s)}`;
    newType = s => `__New${index(s)}`;
  } else {
    text =
      PRELUDE +
      `\nimport type * as __OldNS from ${JSON.stringify(OLD_ALIAS)};\n` +
      `import type * as __NewNS from ${JSON.stringify(NEW_ALIAS)};\n\n`;
    oldType = s => `__MtoP<__OldNS.${s}, ${d}>`;
    newType = s => `__MtoP<__NewNS.${s}, ${d}>`;
  }

  let counter = 0;
  const emit = (direction: "consumer" | "forward", symbol: string) => {
    // Dir A / consumer: New must be assignable to Old.
    // Dir B / forward:  Old must be assignable to New.
    const [source, target] =
      direction === "consumer"
        ? [newType(symbol), oldType(symbol)]
        : [oldType(symbol), newType(symbol)];
    const id = counter++;
    const stmt =
      `declare const __src_${id}: ${source};\n` +
      `export const __chk_${id}: ${target} = __src_${id};\n`;
    const start = text.length;
    text += stmt;
    checks.push({ direction, symbol, start, end: text.length });
  };

  const targets = symbols && symbols.length > 0 ? symbols : [""];
  for (const symbol of targets) {
    for (const direction of directions) {
      emit(direction, symbol);
    }
  }

  return { fileName: buildFileName(anchorDir), text, checks };
}
