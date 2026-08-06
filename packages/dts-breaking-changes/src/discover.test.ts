import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  discoverSurfaces,
  discoverWorkspacePackages,
  resolveEntrypoints,
} from "./discover.ts";

const WS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/workspace"
);
const pkg = (name: string) => path.join(WS, "packages", name);

test("resolveEntrypoints handles explicit types, subpaths, implicit siblings, and legacy", () => {
  const entries = (dir: string) =>
    resolveEntrypoints(dir)
      .map(e => `${e.subpath} -> ${e.entry}`)
      .sort();

  assert.deepEqual(entries(pkg("explicit")), [
    ". -> built/index.d.ts",
    "./sub -> built/sub.d.ts", // implicit sibling of ./built/sub.js, no types field
  ]);
  assert.deepEqual(entries(pkg("implicit")), [". -> built/index.d.ts"]);
  assert.deepEqual(entries(pkg("legacy")), [". -> index.d.ts"]);
  assert.deepEqual(entries(pkg("notypes")), []);
});

test("discoverWorkspacePackages reads pnpm-workspace.yaml globs", () => {
  const names = discoverWorkspacePackages(WS)
    .map(p => p.name)
    .sort();
  assert.deepEqual(names, [
    "@fx/explicit",
    "@fx/implicit",
    "@fx/legacy",
    "@fx/notypes",
  ]);
});

test("discoverSurfaces yields one surface per public entrypoint, base paired with head", () => {
  const surfaces = discoverSurfaces({
    baseRoot: WS,
    headRoot: WS,
    majorPackages: ["@fx/legacy"],
  });
  const titles = surfaces.map(s => s.title).sort();
  assert.deepEqual(titles, [
    "@fx/explicit",
    "@fx/explicit/sub",
    "@fx/implicit",
    "@fx/legacy",
  ]);
  // majorPackages pre-acknowledges the affected package.
  assert.equal(
    surfaces.find(s => s.title === "@fx/legacy")?.allowBreaking,
    true
  );
  assert.equal(
    surfaces.find(s => s.title === "@fx/explicit")?.allowBreaking,
    false
  );
});

test("discoverSurfaces skips an entrypoint with no baseline", () => {
  // A head-only package dir with no counterpart under an empty base root.
  const surfaces = discoverSurfaces({
    baseRoot: path.join(WS, "nonexistent"),
    headRoot: WS,
  });
  assert.deepEqual(surfaces, []);
});
