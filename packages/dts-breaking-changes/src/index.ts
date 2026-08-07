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
export {
  discoverSurfaces,
  discoverWorkspacePackages,
  resolveEntrypoints,
  type Surface,
  type DiscoverOptions,
} from "./discover.ts";
export { diffApi } from "./apidiff.ts";
export type {
  ApiChange,
  Direction,
  Finding,
  Report,
  Severity,
  Verdict,
} from "./types.ts";
