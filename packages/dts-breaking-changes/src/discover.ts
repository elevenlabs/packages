import * as fs from "node:fs";
import * as path from "node:path";

import ts from "typescript";
import { parse as parseYaml } from "yaml";

import { configFileSchema } from "./config.ts";

export interface Surface {
  /** Package name (groups sections in the report). */
  package: string;
  /** Export subpath, e.g. "." or "./internal". */
  subpath: string;
  /** Export condition that selects this type surface; "default" is implicit. */
  condition: string;
  oldDir: string;
  newDir: string;
  entry: string;
  config?: string;
  allowBreaking?: boolean;
}

interface PackageJson {
  name?: string;
  types?: string;
  typings?: string;
  main?: string;
  exports?: unknown;
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Export subpaths declared by a package: the `exports` keys, or `.` (legacy). */
function enumerateSubpaths(pkg: PackageJson): string[] {
  const exp = pkg.exports;
  if (exp == null || typeof exp === "string") return ["."];
  const keys = Object.keys(exp as object).filter(
    k => k === "." || k.startsWith("./")
  );
  return keys.length ? keys : ["."];
}

const TS_OPTIONS: ts.CompilerOptions = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolvePackageJsonExports: true,
};

function jsToDts(p: string): string {
  return p
    .replace(/\.mjs$/, ".d.mts")
    .replace(/\.cjs$/, ".d.cts")
    .replace(/\.jsx?$/, ".d.ts");
}

/** Legacy resolution for a package with no usable `exports` (types/typings/main). */
function legacyEntry(pkgDir: string, pkg: PackageJson): string | undefined {
  const candidate =
    pkg.types || pkg.typings || (pkg.main ? jsToDts(pkg.main) : "index.d.ts");
  const rel = candidate.replace(/^\.\//, "");
  return fs.existsSync(path.join(pkgDir, rel)) ? rel : undefined;
}

/** The `exports` value for a subpath ("." when exports is a string or conditions-only). */
function subpathValue(exports: unknown, subpath: string): unknown {
  if (exports == null || typeof exports !== "object") return exports;
  const record = exports as Record<string, unknown>;
  const hasSubpaths = Object.keys(record).some(
    k => k === "." || k.startsWith("./")
  );
  return hasSubpaths ? record[subpath] : record;
}

/** Condition names (recursively) in an exports value — every key that isn't a subpath. */
function conditionNames(value: unknown): string[] {
  const names = new Set<string>();
  const walk = (v: unknown) => {
    if (!v || typeof v !== "object" || Array.isArray(v)) return;
    for (const [key, child] of Object.entries(v)) {
      if (!key.startsWith(".")) names.add(key);
      walk(child);
    }
  };
  walk(value);
  return [...names];
}

/** Resolve a specifier's types under a set of custom conditions, relative to the package. */
function resolveDts(
  pkgDir: string,
  spec: string,
  containingFile: string,
  conditions: string[]
): string | undefined {
  const options: ts.CompilerOptions = {
    ...TS_OPTIONS,
    ...(conditions.length ? { customConditions: conditions } : {}),
  };
  const resolved = ts.resolveModuleName(spec, containingFile, options, ts.sys)
    .resolvedModule?.resolvedFileName;
  return resolved && /\.d\.[mc]?ts$/.test(resolved)
    ? path.relative(pkgDir, resolved)
    : undefined;
}

/**
 * Resolve a package's public type entrypoints using the TS compiler's own module
 * resolution — one per (subpath × condition) that resolves to a distinct `.d.ts`.
 * Resolving the package by its own name from a virtual file inside its directory
 * (self-reference) honors `exports`, the `types` condition, and the implicit
 * JS-sibling `.d.ts` fallback, exactly as a consumer's `tsc` would. A subpath's
 * export conditions are enumerated and resolved individually, so a condition that
 * points at a different type surface (e.g. `react-native`) is checked too; the
 * `default` resolution is implicit and conditions that resolve to the same file
 * are folded into it. Requires the package to be already built.
 */
export function resolveEntrypoints(
  pkgDir: string
): Array<{ subpath: string; condition: string; entry: string }> {
  const pkg = readJson(path.join(pkgDir, "package.json")) as PackageJson;
  const containingFile = path.join(pkgDir, "__dts_resolve__.ts");
  const out: Array<{ subpath: string; condition: string; entry: string }> = [];
  for (const subpath of enumerateSubpaths(pkg)) {
    const byFile = new Map<string, string>(); // entry -> condition label
    if (pkg.name) {
      const spec =
        subpath === "." ? pkg.name : `${pkg.name}/${subpath.slice(2)}`;
      const def = resolveDts(pkgDir, spec, containingFile, []);
      if (def) byFile.set(def, "default");
      for (const condition of conditionNames(
        subpathValue(pkg.exports, subpath)
      )) {
        const entry = resolveDts(pkgDir, spec, containingFile, [condition]);
        if (entry && !byFile.has(entry)) byFile.set(entry, condition);
      }
    }
    if (byFile.size === 0 && subpath === ".") {
      const entry = legacyEntry(pkgDir, pkg);
      if (entry) byFile.set(entry, "default");
    }
    for (const [entry, condition] of byFile) {
      if (fs.existsSync(path.join(pkgDir, entry))) {
        out.push({ subpath, condition, entry });
      }
    }
  }
  return out;
}

function readWorkspaceGlobs(root: string): string[] {
  const workspaceFile = path.join(root, "pnpm-workspace.yaml");
  if (fs.existsSync(workspaceFile)) {
    const doc = parseYaml(fs.readFileSync(workspaceFile, "utf8")) as {
      packages?: string[];
    } | null;
    return doc?.packages ?? [];
  }
  const pkgJsonPath = path.join(root, "package.json");
  if (fs.existsSync(pkgJsonPath)) {
    const ws = (readJson(pkgJsonPath) as { workspaces?: unknown }).workspaces;
    if (Array.isArray(ws)) return ws;
    if (
      ws &&
      typeof ws === "object" &&
      Array.isArray((ws as { packages?: unknown }).packages)
    ) {
      return (ws as { packages: string[] }).packages;
    }
  }
  return [];
}

/** Expand workspace globs (exact paths and a trailing `/*`) to package dirs. */
function expandGlobs(root: string, globs: string[]): string[] {
  const dirs = new Set<string>();
  for (const glob of globs) {
    if (glob.startsWith("!")) continue;
    if (glob.endsWith("/*")) {
      const parent = path.join(root, glob.slice(0, -2));
      if (!fs.existsSync(parent)) continue;
      for (const name of fs.readdirSync(parent)) {
        const dir = path.join(parent, name);
        if (fs.statSync(dir).isDirectory()) dirs.add(dir);
      }
    } else {
      const dir = path.join(root, glob);
      if (fs.existsSync(dir)) dirs.add(dir);
    }
  }
  return [...dirs];
}

/** Workspace packages (name + dir) from pnpm-workspace.yaml or package.json workspaces. */
export function discoverWorkspacePackages(
  root: string
): Array<{ name: string; dir: string }> {
  return expandGlobs(root, readWorkspaceGlobs(root))
    .map(dir => {
      const pkgJson = path.join(dir, "package.json");
      if (!fs.existsSync(pkgJson)) return undefined;
      const name = (readJson(pkgJson) as PackageJson).name;
      return name ? { name, dir } : undefined;
    })
    .filter((p): p is { name: string; dir: string } => p !== undefined);
}

/** Match an export subpath (e.g. `./internal/unity`) against a glob (`*`/`**`). */
function matchEntrypoint(glob: string, subpath: string): boolean {
  const rx = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\0")
    .replace(/\*/g, "[^/]*")
    .replace(/\0/g, ".*");
  return new RegExp(`^${rx}$`).test(subpath);
}

export interface DiscoverOptions {
  baseRoot: string;
  headRoot: string;
  /** Package names with a major changeset (pre-acknowledged). */
  majorPackages?: string[];
}

/**
 * Discover the surfaces to check across a workspace: every public type
 * entrypoint of every package in `headRoot`, paired with its counterpart under
 * `baseRoot`. A package's `dts-breaking-changes.json` may drop subpaths via
 * `ignoreEntrypoints`. Entrypoints with no baseline (new packages/subpaths) are
 * skipped.
 */
export function discoverSurfaces(opts: DiscoverOptions): Surface[] {
  const major = new Set(opts.majorPackages ?? []);
  const surfaces: Surface[] = [];
  for (const { name, dir } of discoverWorkspacePackages(opts.headRoot)) {
    const rel = path.relative(opts.headRoot, dir);
    const configPath = path.join(dir, "dts-breaking-changes.json");
    const hasConfig = fs.existsSync(configPath);
    const ignore = hasConfig
      ? (configFileSchema.parse(readJson(configPath)).ignoreEntrypoints ?? [])
      : [];
    for (const ep of resolveEntrypoints(dir)) {
      if (ignore.some(g => matchEntrypoint(g, ep.subpath))) continue;
      if (!fs.existsSync(path.join(opts.baseRoot, rel, ep.entry))) continue;
      surfaces.push({
        package: name,
        subpath: ep.subpath,
        condition: ep.condition,
        oldDir: path.join(opts.baseRoot, rel),
        newDir: path.join(opts.headRoot, rel),
        entry: ep.entry,
        config: hasConfig ? configPath : undefined,
        allowBreaking: major.has(name),
      });
    }
  }
  return surfaces;
}
