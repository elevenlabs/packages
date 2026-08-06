import * as path from "node:path";
import ts from "typescript";

import {
  matchGlob,
  resolveConfig,
  type AnalyzeConfig,
  type ResolvedConfig,
} from "./config.ts";
import {
  buildHarness,
  NEW_ALIAS,
  OLD_ALIAS,
  type Harness,
  type Space,
} from "./harness.ts";
import { renderMarkdown, verdictFrom } from "./report.ts";
import type { Direction, Finding, Report, Severity } from "./types.ts";

export interface AnalyzeInput {
  /** Directory of the previously-published (base) built `.d.ts` tree. */
  oldDir: string;
  /** Directory of the PR's (head) built `.d.ts` tree. */
  newDir: string;
  config: AnalyzeConfig;
  baseSha?: string;
}

const BASE_OPTIONS: ts.CompilerOptions = {
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  noEmitOnError: false,
  types: [],
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolvePackageJsonExports: true,
  resolvePackageJsonImports: true,
};

function stripDtsExt(file: string): string {
  return file.replace(/\.d\.ts$/, "").replace(/\.ts$/, "");
}

function pathsFor(oldEntry: string, newEntry: string): ts.CompilerOptions {
  const root = path.parse(oldEntry).root || "/";
  const rel = (p: string) => stripDtsExt(path.resolve(p)).slice(root.length);
  return {
    baseUrl: root,
    paths: {
      [OLD_ALIAS]: [rel(oldEntry)],
      [NEW_ALIAS]: [rel(newEntry)],
    },
  };
}

function createProgram(
  harness: Harness,
  extra: ts.CompilerOptions
): { program: ts.Program; source: ts.SourceFile } {
  const options = { ...BASE_OPTIONS, ...extra };
  const host = ts.createCompilerHost(options, true);
  const source = ts.createSourceFile(
    harness.fileName,
    harness.text,
    ts.ScriptTarget.ES2022,
    true
  );

  const origGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) =>
    path.resolve(fileName) === path.resolve(harness.fileName)
      ? source
      : origGetSourceFile(fileName, languageVersion, onError, shouldCreate);
  const origFileExists = host.fileExists.bind(host);
  host.fileExists = fileName =>
    path.resolve(fileName) === path.resolve(harness.fileName) ||
    origFileExists(fileName);
  const origReadFile = host.readFile.bind(host);
  host.readFile = fileName =>
    path.resolve(fileName) === path.resolve(harness.fileName)
      ? harness.text
      : origReadFile(fileName);

  const program = ts.createProgram([harness.fileName], options, host);
  return { program, source };
}

interface RawFinding {
  direction: Direction;
  space: Space;
  symbol: string;
  code: number;
  message: string;
  baseSeverity: Severity;
}

/** Drop noisy absolute `import("/abs/path")` qualifiers from a diagnostic message. */
function cleanMessage(message: string): string {
  return message
    .replace(/import\("[^"]*"\)\./g, "")
    .replace(/import\("[^"]*"\)/g, "<module>");
}

/**
 * Diagnostics whose root cause is an access-restricted (private/protected)
 * member are nominal artifacts of comparing two independent builds: such members
 * are not part of the consumer-visible contract, so the mismatch can never be a
 * real breaking change. `MethodsToProperties` strips them where it recurses, but
 * classes reached only through parameter positions (kept positional to preserve
 * variance and overloads) slip through — hence this guard. TS phrases these
 * several ways ("separate declarations of a private property", "is protected but
 * type X is not a class derived from Y", "is private and only accessible ...").
 * A real access-narrowing change instead shows up as a *missing* member, so it
 * is not caught here.
 */
function isNominalAccessArtifact(message: string): boolean {
  return (
    /separate declarations of a (private|protected) property/.test(message) ||
    /Property '[^']*' is (private|protected)\b/.test(message)
  );
}

/**
 * Base severity before per-symbol overrides. Consumer-direction failures always
 * break. Forward-direction failures are informational on the value surface, but
 * a warning on the (ambiguous) type surface: an added required field breaks any
 * consumer that constructs the type.
 */
function baseSeverity(direction: Direction, space: Space): Severity {
  if (direction === "consumer") return "breaking";
  return space === "type" ? "warning" : "info";
}

/** Attribute each harness-file semantic diagnostic to the check whose span contains it. */
function collectDiagnostics(
  program: ts.Program,
  source: ts.SourceFile,
  harness: Harness,
  space: Space
): RawFinding[] {
  const diags = program.getSemanticDiagnostics(source);
  const out: RawFinding[] = [];
  for (const diag of diags) {
    if (
      !diag.file ||
      path.resolve(diag.file.fileName) !== path.resolve(harness.fileName)
    )
      continue;
    const at = diag.start ?? -1;
    const check = harness.checks.find(c => at >= c.start && at < c.end);
    if (!check) continue;
    out.push({
      direction: check.direction,
      space,
      symbol: check.symbol,
      code: diag.code,
      message: cleanMessage(
        ts.flattenDiagnosticMessageText(diag.messageText, "\n")
      ),
      baseSeverity: baseSeverity(check.direction, space),
    });
  }
  return out;
}

function assertNoDeepInstantiation(
  diags: RawFinding[],
  config: ResolvedConfig
): void {
  if (diags.some(d => d.code === 2589)) {
    throw new Error(
      `dts-breaking-changes: type instantiation too deep (TS2589) at transformDepth=${config.transformDepth}. ` +
        `Lower transformDepth or switch this surface to per-symbol-primary analysis.`
    );
  }
}

type ExportKind = "value" | "type";

/**
 * A `export type { X }` / `export { type X }` re-export never contributes to the
 * value namespace, even when X resolves to a value (e.g. a class) at its source —
 * so `getAliasedSymbol` alone can't be trusted. Honor the type-only modifier
 * before falling back to the resolved symbol's flags.
 */
function isValueExport(checker: ts.TypeChecker, sym: ts.Symbol): boolean {
  for (const decl of sym.getDeclarations() ?? []) {
    if (!ts.isExportSpecifier(decl)) continue;
    if (decl.isTypeOnly) return false;
    const clause = decl.parent.parent; // NamedExports -> ExportDeclaration
    if (ts.isExportDeclaration(clause) && clause.isTypeOnly) return false;
  }
  const resolved =
    sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
  return (resolved.flags & ts.SymbolFlags.Value) !== 0;
}

/**
 * Export names of a given kind. `value` = anything in the value namespace
 * (class/function/const/enum/namespace); `type` = pure type-only exports
 * (interface/type alias, or a `export type` re-export).
 */
function exportNames(
  program: ts.Program,
  entryAbs: string,
  kind: ExportKind
): string[] {
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(entryAbs);
  if (!source) return [];
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) return [];
  return checker
    .getExportsOfModule(moduleSymbol)
    .filter(sym =>
      kind === "value"
        ? isValueExport(checker, sym)
        : !isValueExport(checker, sym)
    )
    .map(s => s.getName());
}

function dedupe(findings: RawFinding[]): RawFinding[] {
  const seen = new Set<string>();
  return findings.filter(f => {
    const key = `${f.space}\0${f.direction}\0${f.symbol}\0${f.code}\0${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function applyOverrides(
  base: Severity,
  symbol: string,
  config: ResolvedConfig
): Severity {
  for (const [glob, sev] of Object.entries(config.severityOverrides)) {
    if (symbol !== "" && matchGlob(glob, symbol)) return sev;
  }
  return base;
}

function directionsToCheck(config: ResolvedConfig): Direction[] {
  return config.gateDirection === "forward"
    ? ["forward", "consumer"]
    : ["consumer", "forward"];
}

/** Name-set diff into synthetic add/remove findings. Removals break; additions inform. */
function addRemoveFindings(
  oldNames: string[],
  newNames: string[],
  space: Space
): RawFinding[] {
  const oldSet = new Set(oldNames);
  const newSet = new Set(newNames);
  const removed = oldNames.filter(n => !newSet.has(n));
  const added = newNames.filter(n => !oldSet.has(n));
  return [
    ...removed.map(
      (name): RawFinding => ({
        direction: "consumer",
        space,
        symbol: name,
        code: 0,
        message: `Export \`${name}\` was removed.`,
        baseSeverity: "breaking",
      })
    ),
    ...added.map(
      (name): RawFinding => ({
        direction: "forward",
        space,
        symbol: name,
        code: 0,
        message: `Export \`${name}\` was added.`,
        baseSeverity: "info",
      })
    ),
  ];
}

interface SurfaceContext {
  prog1: ts.Program;
  oldEntry: string;
  newEntry: string;
  anchorDir: string;
  aliasOptions: ts.CompilerOptions;
  directions: Direction[];
  config: ResolvedConfig;
}

/**
 * Value surface: a whole-module fast gate (Pass 1), and — only when a direction
 * is red — per-symbol localization plus add/remove diffing (Pass 2).
 */
function compareValueSurface(
  ctx: SurfaceContext,
  wholeGate: RawFinding[]
): RawFinding[] {
  const red = new Set(wholeGate.map(d => d.direction));
  if (red.size === 0) return [];

  const oldNames = exportNames(ctx.prog1, ctx.oldEntry, "value");
  const newNames = exportNames(ctx.prog1, ctx.newEntry, "value");
  const newSet = new Set(newNames);
  const common = oldNames.filter(n => newSet.has(n));

  const raw = addRemoveFindings(oldNames, newNames, "value");
  const pass2 = buildHarness({
    anchorDir: ctx.anchorDir,
    transformDepth: ctx.config.transformDepth,
    space: "value",
    directions: [...red],
    symbols: common,
  });
  const { program, source } = createProgram(pass2, ctx.aliasOptions);
  raw.push(...collectDiagnostics(program, source, pass2, "value"));

  // Fall back to the whole-module diagnostic for any red direction that
  // localization couldn't attribute (e.g. a purely top-level shape change).
  for (const direction of red) {
    if (!raw.some(d => d.direction === direction)) {
      raw.push(...wholeGate.filter(d => d.direction === direction));
    }
  }
  return dedupe(raw);
}

/** Type-only surface (opt-in): compare each common pure-type export by name in type space. */
function compareTypeSurface(ctx: SurfaceContext): RawFinding[] {
  const oldNames = exportNames(ctx.prog1, ctx.oldEntry, "type");
  const newNames = exportNames(ctx.prog1, ctx.newEntry, "type");
  const newSet = new Set(newNames);
  const common = oldNames.filter(n => newSet.has(n));

  const raw = addRemoveFindings(oldNames, newNames, "type");
  if (common.length > 0) {
    const harness = buildHarness({
      anchorDir: ctx.anchorDir,
      transformDepth: ctx.config.transformDepth,
      space: "type",
      directions: ctx.directions,
      symbols: common,
    });
    const { program, source } = createProgram(harness, ctx.aliasOptions);
    const diags = collectDiagnostics(program, source, harness, "type");
    assertNoDeepInstantiation(diags, ctx.config);
    raw.push(...diags);
  }
  return dedupe(raw);
}

export function analyze(input: AnalyzeInput): Report {
  const config = resolveConfig(input.config);
  const oldEntry = path.resolve(input.oldDir, config.entry);
  const newEntry = path.resolve(input.newDir, config.entry);
  const aliasOptions = pathsFor(oldEntry, newEntry);
  const anchorDir = path.dirname(oldEntry);
  const directions = directionsToCheck(config);

  // Value surface whole-module fast gate (Pass 1).
  const pass1 = buildHarness({
    anchorDir,
    transformDepth: config.transformDepth,
    space: "value",
    directions,
  });
  const { program: prog1, source: src1 } = createProgram(pass1, aliasOptions);
  const whole = collectDiagnostics(prog1, src1, pass1, "value");
  assertNoDeepInstantiation(whole, config);

  const ctx: SurfaceContext = {
    prog1,
    oldEntry,
    newEntry,
    anchorDir,
    aliasOptions,
    directions,
    config,
  };
  const raw = compareValueSurface(ctx, whole);
  if (config.compareTypeOnlyExports) raw.push(...compareTypeSurface(ctx));

  const findings: Finding[] = raw
    .filter(d => !isNominalAccessArtifact(d.message))
    .filter(
      d =>
        !config.ignore.some(
          glob => d.symbol !== "" && matchGlob(glob, d.symbol)
        )
    )
    .map(d => ({
      direction: d.direction,
      severity: applyOverrides(d.baseSeverity, d.symbol, config),
      symbol: d.symbol,
      code: d.code,
      message: d.message,
    }));

  const verdict = verdictFrom(findings, config);
  const markdown = renderMarkdown(findings, verdict, input.baseSha);
  return { findings, verdict, markdown, baseSha: input.baseSha };
}
