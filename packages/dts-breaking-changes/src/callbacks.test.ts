import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { analyze } from "./analyze.ts";

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/callbacks"
);

function gate(dir: string): { gate: string; breaking: number } {
  const report = analyze({
    oldDir: path.join(FIXTURES, dir, "old"),
    newDir: path.join(FIXTURES, dir, "new"),
    config: { entry: "index.d.ts", gateDirection: "consumer" },
  });
  return {
    gate: report.verdict.gate,
    breaking: report.verdict.breakingCount,
  };
}

// Callbacks the consumer supplies are checked doubly-contravariantly: the event
// the library passes is itself in a parameter position. These lock that down.

test("a callback event gaining a field is NOT breaking (the library provides more)", () => {
  assert.equal(gate("event-gains-field").gate, "pass");
});

test("a callback event losing a field IS breaking (consumers relied on it)", () => {
  assert.equal(gate("event-loses-field").gate, "fail");
});

test("requiring a callback to return a value is breaking", () => {
  assert.equal(gate("return-added").gate, "fail");
});

test("a new required callback on an options bag is breaking", () => {
  const r = gate("new-required-callback");
  assert.equal(r.gate, "fail");
  assert.ok(r.breaking > 0);
});
