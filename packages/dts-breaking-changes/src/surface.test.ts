import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { analyze } from "./analyze.ts";

/**
 * Fixture 4: the full `elevenlabs-js` type surface (~5k `.d.ts` files) must not
 * trip `TS2589` at the default transform depth.
 *
 * The two dirs are separate copies, not the same dir: comparing a surface to
 * itself hides nominal cross-build artifacts (e.g. classes with private members
 * reached through a parameter), which is exactly the real workflow scenario.
 *
 * Locate the built dist via `DTS_BREAKING_CHANGES_JS_DIST`, else a sibling
 * checkout. Skipped when neither is present (e.g. the engine's own package CI).
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

test("full elevenlabs-js surface: no TS2589, zero diff across two builds", t => {
  const dist = locateJsDist();
  if (!dist) {
    t.skip(
      "elevenlabs-js dist not found (set DTS_BREAKING_CHANGES_JS_DIST or check out a sibling repo & build)"
    );
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "dts-surface-"));
  const oldDir = path.join(tmp, "old");
  const newDir = path.join(tmp, "new");
  fs.cpSync(dist, oldDir, { recursive: true });
  fs.cpSync(dist, newDir, { recursive: true });
  try {
    const report = analyze({
      oldDir,
      newDir,
      config: { entry: "index.d.ts", gateDirection: "both" },
    });
    assert.deepEqual(
      report.findings,
      [],
      `two-build comparison must be empty, got: ${JSON.stringify(report.findings.slice(0, 5), null, 2)}`
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
