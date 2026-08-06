export { analyze, type AnalyzeInput } from "./analyze.ts";
export {
  resolveConfig,
  matchGlob,
  type AnalyzeConfig,
  type GateDirection,
  type ResolvedConfig,
} from "./config.ts";
export {
  renderMarkdown,
  renderCombined,
  sectionFails,
  type CombinedSection,
} from "./report.ts";
export type { Direction, Finding, Report, Severity, Verdict } from "./types.ts";
