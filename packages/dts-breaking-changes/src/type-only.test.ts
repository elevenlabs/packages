import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { analyze } from "./analyze.ts";

const FIXTURES = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures"
);
const fx = (...p: string[]) => path.join(FIXTURES, ...p);

test("type-only exports are ignored unless compareTypeOnlyExports is set", () => {
  const report = analyze({
    oldDir: fx("type-only/old"),
    newDir: fx("type-only/narrow"),
    config: { entry: "index.d.ts", gateDirection: "consumer" },
  });
  assert.deepEqual(report.findings, [], "type surface must be off by default");
});

test("narrowing a type-only export is consumer-breaking when the flag is on", () => {
  const report = analyze({
    oldDir: fx("type-only/old"),
    newDir: fx("type-only/narrow"),
    config: {
      entry: "index.d.ts",
      gateDirection: "consumer",
      compareTypeOnlyExports: true,
    },
  });
  assert.equal(report.verdict.gate, "fail");
  assert.ok(
    report.findings.some(
      f =>
        f.severity === "breaking" &&
        f.direction === "consumer" &&
        f.symbol === "Incoming"
    ),
    `expected Incoming breaking, got: ${JSON.stringify(report.findings.map(f => [f.symbol, f.severity]))}`
  );
});

test("adding a required field to a type-only export is a warning, not a gate failure", () => {
  const report = analyze({
    oldDir: fx("type-only/old"),
    newDir: fx("type-only/add-required"),
    config: {
      entry: "index.d.ts",
      gateDirection: "consumer",
      compareTypeOnlyExports: true,
    },
  });
  assert.equal(
    report.verdict.gate,
    "pass",
    "an added required field must not fail the default gate"
  );
  assert.ok(
    report.findings.some(
      f => f.severity === "warning" && f.symbol === "Outgoing"
    ),
    `expected Outgoing warning, got: ${JSON.stringify(report.findings.map(f => [f.symbol, f.severity]))}`
  );
  assert.equal(
    report.findings.filter(f => f.severity === "breaking").length,
    0
  );
});

test("removing a type-only export is consumer-breaking", () => {
  const report = analyze({
    oldDir: fx("type-only/old"),
    newDir: fx("type-only/removed"),
    config: {
      entry: "index.d.ts",
      gateDirection: "consumer",
      compareTypeOnlyExports: true,
    },
  });
  assert.equal(report.verdict.gate, "fail");
  assert.ok(
    report.findings.some(
      f => f.severity === "breaking" && f.symbol === "Alias"
    ),
    `expected Alias removal breaking, got: ${JSON.stringify(report.findings.map(f => [f.symbol, f.severity]))}`
  );
});

test("identical type-only surface yields zero findings with the flag on", () => {
  const report = analyze({
    oldDir: fx("type-only/old"),
    newDir: fx("type-only/old"),
    config: {
      entry: "index.d.ts",
      gateDirection: "both",
      compareTypeOnlyExports: true,
    },
  });
  assert.deepEqual(report.findings, []);
});
