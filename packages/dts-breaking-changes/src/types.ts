/**
 * Direction of the assignability check that produced a finding.
 *
 * - `consumer` = Dir A (New -> Old): existing callers of the published package.
 *   A failure here means today's consumer code would stop type-checking.
 * - `forward` = Dir B (Old -> New): implementors / forward-compatibility.
 *   A failure here is informational (new export, new required output field).
 */
export type Direction = "consumer" | "forward";

export type Severity = "breaking" | "warning" | "info";

export interface Finding {
  direction: Direction;
  severity: Severity;
  /** Dotted path of the top-level export symbol, or "" for a whole-module finding. */
  symbol: string;
  /** TypeScript diagnostic code (e.g. 2322). */
  code: number;
  /** Flattened diagnostic message chain, including the offending property path. */
  message: string;
}

export interface Verdict {
  gate: "pass" | "fail" | "warn";
  breakingCount: number;
  warningCount: number;
  infoCount: number;
}

/**
 * A structural change to the public API surface, for the (opt-in) summary. This
 * is a review aid enumerated by walking the two module types — the gate remains
 * the authority on whether a change is breaking.
 */
export interface ApiChange {
  kind: "add" | "remove" | "change";
  /** Dotted path, e.g. "compose" or "Client.cancel". */
  path: string;
  /** For add/change: the (new) type rendered for display. */
  signature?: string;
  /** For change: the previous type, so it can render as a `-`/`+` diff. */
  from?: string;
}

export interface Report {
  findings: Finding[];
  verdict: Verdict;
  markdown: string;
  baseSha?: string;
  /** Present only when `apiSummary` is enabled. */
  apiChanges?: ApiChange[];
}
