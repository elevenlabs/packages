import type { ResolvedConfig } from "./config.ts";
import type { ApiChange, Finding, Report, Severity, Verdict } from "./types.ts";

const SEVERITY_RANK: Record<Severity, number> = {
  breaking: 3,
  warning: 2,
  info: 1,
};

export function verdictFrom(
  findings: Finding[],
  config: ResolvedConfig
): Verdict {
  const breakingCount = findings.filter(f => f.severity === "breaking").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const infoCount = findings.filter(f => f.severity === "info").length;
  const threshold = SEVERITY_RANK[config.failOn];
  const gate = findings.some(f => SEVERITY_RANK[f.severity] >= threshold)
    ? "fail"
    : "pass";
  return { gate, breakingCount, warningCount, infoCount };
}

const HEADING: Record<Severity, string> = {
  breaking: "Breaking changes (consumer-facing)",
  warning: "Warnings",
  info: "Forward-compatibility notes",
};

const ICON: Record<Severity, string> = {
  breaking: "🔴",
  warning: "🟠",
  info: "🟢",
};

/** The deepest line of a flattened TS diagnostic chain is the most specific. */
function headline(message: string): string {
  const lines = message
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);
  return lines.at(-1) ?? message;
}

function row(f: Finding): string {
  const where = f.symbol ? `\`${f.symbol}\`` : "_module surface_";
  const code = f.code > 0 ? ` (TS${f.code})` : "";
  const head = `- ${where}${code} — ${headline(f.message)}`;
  const isChain = f.message.includes("\n");
  if (!isChain) return head;
  const full = f.message.split("\n").join("\n  > ");
  return `${head}\n  <details><summary>full type diff</summary>\n\n  > ${full}\n  </details>`;
}

function section(findings: Finding[], severity: Severity): string {
  const rows = findings.filter(f => f.severity === severity);
  if (rows.length === 0) return "";
  return `\n#### ${ICON[severity]} ${HEADING[severity]}\n\n${rows.map(row).join("\n")}\n`;
}

export function renderMarkdown(
  findings: Finding[],
  verdict: Verdict,
  baseSha?: string,
  apiChanges?: ApiChange[]
): string {
  const header = "### Type surface: breaking-change report";
  // No backticks around the SHA: GitHub auto-links a bare commit SHA, not a code-spanned one.
  const base = baseSha ? `\n\nCompared against base ${baseSha}.` : "";
  const hasApi = apiChanges !== undefined && apiChanges.length > 0;

  if (findings.length === 0 && !hasApi) {
    return `${header}${base}\n\n✅ No type-surface changes detected.\n`;
  }

  const summary =
    verdict.gate === "fail"
      ? `❌ **${verdict.breakingCount} consumer-breaking change(s)** detected.`
      : `⚠️ No consumer-breaking changes; ${verdict.warningCount + verdict.infoCount} note(s).`;

  return [
    header,
    base,
    "",
    summary,
    section(findings, "breaking"),
    section(findings, "warning"),
    hasApi ? renderApiDiff(apiChanges) : section(findings, "info"),
    "\n_Add the `breaking` label to acknowledge and turn this check into a warning._",
  ]
    .filter(Boolean)
    .join("\n");
}

/** One entrypoint's result within a combined, multi-package report. */
export interface CombinedSection {
  /** Package name; sections sharing it are grouped under one heading. */
  package: string;
  /** Export subpath within the package (e.g. "." or "./internal"). */
  subpath: string;
  /** Export condition that selects this surface; "default" is implicit. */
  condition: string;
  /** Whether a breaking result here is acknowledged (label or major changeset). */
  acknowledged: boolean;
  /** Human reason shown when acknowledged, e.g. "the `breaking` label". */
  ackReason?: string;
  report: Report;
}

/** A section is an unacknowledged failure when it breaks and nobody signed off. */
export function sectionFails(s: CombinedSection): boolean {
  return s.report.verdict.gate === "fail" && !s.acknowledged;
}

/** Entrypoint label: the subpath, plus the condition when it isn't the default. */
function entrypointLabel(s: CombinedSection): string {
  return s.condition === "default"
    ? `\`${s.subpath}\``
    : `\`${s.subpath}\` (${s.condition})`;
}

function truncate(s: string, max = 100): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

/** A ```diff summary of API additions/removals/changes (a review aid). */
function renderApiDiff(changes: ApiChange[]): string {
  if (changes.length === 0) return "";
  const line = (c: ApiChange): string => {
    const sig = c.signature ? `: ${truncate(c.signature)}` : "";
    if (c.kind === "add") return `+ ${c.path}${sig}`;
    if (c.kind === "remove") return `- ${c.path}`;
    return `- ${c.path}: ${truncate(c.from ?? "")}\n+ ${c.path}${sig}`;
  };
  const body = changes.map(line).join("\n");
  return `<details><summary>API changes</summary>\n\n\`\`\`diff\n${body}\n\`\`\`\n\n</details>`;
}

/** The findings body for one section, without its own heading. */
function sectionBody(s: CombinedSection): string {
  const { findings, apiChanges } = s.report;
  const hasApi = apiChanges !== undefined && apiChanges.length > 0;
  if (findings.length === 0 && !hasApi) return "✅ No type-surface changes.";
  const ackNote =
    s.acknowledged && s.report.verdict.gate === "fail"
      ? `\n✅ Acknowledged via ${s.ackReason ?? "an override"} — reported as a warning.\n`
      : "";
  return [
    section(findings, "breaking"),
    section(findings, "warning"),
    // The API diff supersedes the (noisier) forward-compatibility notes.
    hasApi ? renderApiDiff(apiChanges) : section(findings, "info"),
    ackNote,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Group sections by package, preserving first-seen order. */
function groupByPackage(
  sections: CombinedSection[]
): Map<string, CombinedSection[]> {
  const groups = new Map<string, CombinedSection[]>();
  for (const s of sections) {
    const group = groups.get(s.package);
    if (group) group.push(s);
    else groups.set(s.package, [s]);
  }
  return groups;
}

/** One package heading; entrypoints become subsections only when there is more than one. */
function renderPackage(pkg: string, sections: CombinedSection[]): string {
  const heading = `## ${pkg}`;
  if (sections.length === 1)
    return `${heading}\n\n${sectionBody(sections[0])}\n`;
  return [
    heading,
    ...sections.map(s => `### ${entrypointLabel(s)}\n\n${sectionBody(s)}\n`),
  ].join("\n");
}

/** Render one comment covering several packages, each under its own heading. */
export function renderCombined(
  sections: CombinedSection[],
  baseSha?: string
): string {
  const header = "### Type surface report";
  const base = baseSha ? `\n\nCompared against base ${baseSha}.` : "";

  const groups = groupByPackage(sections);
  const pkgCount = groups.size;
  const groupList = [...groups.values()];
  const failing = groupList.filter(g => g.some(sectionFails)).length;
  const acked = groupList.filter(
    g =>
      !g.some(sectionFails) &&
      g.some(s => s.report.verdict.gate === "fail" && s.acknowledged)
  ).length;
  const anyFindings = sections.some(s => s.report.findings.length > 0);

  const summary =
    failing > 0
      ? `❌ **${failing} of ${pkgCount} package(s)** have consumer-breaking changes${acked ? ` (${acked} acknowledged)` : ""}.`
      : anyFindings
        ? `⚠️ No unacknowledged breaking changes across ${pkgCount} package(s).`
        : `✅ No type-surface changes across ${pkgCount} package(s).`;

  const hint =
    failing > 0
      ? "\n_Add the `breaking` label or a `major` changeset to acknowledge and turn this into a warning._"
      : "";

  return [
    header,
    base,
    "",
    summary,
    "",
    [...groups].map(([pkg, secs]) => renderPackage(pkg, secs)).join("\n"),
    hint,
  ]
    .filter(Boolean)
    .join("\n");
}
