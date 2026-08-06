import type { ResolvedConfig } from "./config.ts";
import type { Finding, Report, Severity, Verdict } from "./types.ts";

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
  baseSha?: string
): string {
  const header = "### Type surface: breaking-change report";
  // No backticks around the SHA: GitHub auto-links a bare commit SHA, not a code-spanned one.
  const base = baseSha ? `\n\nCompared against base ${baseSha}.` : "";

  if (findings.length === 0) {
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
    section(findings, "info"),
    "\n_Add the `breaking` label to acknowledge and turn this check into a warning._",
  ]
    .filter(Boolean)
    .join("\n");
}

/** One package's result within a combined, multi-package report. */
export interface CombinedSection {
  /** Visible heading for this section (e.g. the package name). */
  title: string;
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

function renderSection(s: CombinedSection): string {
  const { findings } = s.report;
  const title = `## ${s.title}`;
  if (findings.length === 0) return `${title}\n\n✅ No type-surface changes.\n`;
  const ackNote =
    s.acknowledged && s.report.verdict.gate === "fail"
      ? `\n✅ Acknowledged via ${s.ackReason ?? "an override"} — reported as a warning.\n`
      : "";
  return [
    title,
    section(findings, "breaking"),
    section(findings, "warning"),
    section(findings, "info"),
    ackNote,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Render one comment covering several packages, each under its own heading. */
export function renderCombined(
  sections: CombinedSection[],
  baseSha?: string
): string {
  const header = "### Type surface report";
  const base = baseSha ? `\n\nCompared against base ${baseSha}.` : "";

  const failing = sections.filter(sectionFails).length;
  const acked = sections.filter(
    s => s.report.verdict.gate === "fail" && s.acknowledged
  ).length;
  const anyFindings = sections.some(s => s.report.findings.length > 0);

  const summary =
    failing > 0
      ? `❌ **${failing} of ${sections.length} package(s)** have consumer-breaking changes${acked ? ` (${acked} acknowledged)` : ""}.`
      : anyFindings
        ? `⚠️ No unacknowledged breaking changes across ${sections.length} package(s).`
        : `✅ No type-surface changes across ${sections.length} package(s).`;

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
    sections.map(renderSection).join("\n"),
    hint,
  ]
    .filter(Boolean)
    .join("\n");
}
