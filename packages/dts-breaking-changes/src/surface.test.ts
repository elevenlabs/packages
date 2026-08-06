import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { analyze } from "./analyze.ts";

/**
 * Fixture 4: the full `elevenlabs-js` type surface (~5k `.d.ts` files) must not
 * trip `TS2589` at the default transform depth, and comparing the surface to
 * itself must produce zero findings.
 *
 * Locate the built dist via `DTS_BREAKING_CHANGES_JS_DIST`, else a sibling checkout. Skipped
 * when neither is present (e.g. the engine's own package CI).
 */
function locateJsDist(): string | undefined {
  const fromEnv = process.env.DTS_BREAKING_CHANGES_JS_DIST;
  if (fromEnv && fs.existsSync(path.join(fromEnv, "index.d.ts")))
    return fromEnv;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const sibling = path.resolve(here, "../../../../elevenlabs-js/dist");
  if (fs.existsSync(path.join(sibling, "index.d.ts"))) return sibling;
  return undefined;
}

test("full elevenlabs-js surface: no TS2589, zero self-diff", t => {
  const dist = locateJsDist();
  if (!dist) {
    t.skip(
      "elevenlabs-js dist not found (set DTS_BREAKING_CHANGES_JS_DIST or check out a sibling repo & build)"
    );
    return;
  }
  const report = analyze({
    oldDir: dist,
    newDir: dist,
    config: { entry: "index.d.ts", gateDirection: "both" },
  });
  assert.deepEqual(
    report.findings,
    [],
    `self-comparison must be empty, got: ${JSON.stringify(report.findings.slice(0, 5), null, 2)}`
  );
});
