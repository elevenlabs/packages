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

export interface Report {
  findings: Finding[];
  verdict: Verdict;
  markdown: string;
  baseSha?: string;
}
