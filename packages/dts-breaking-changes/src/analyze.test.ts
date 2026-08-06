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

test("added required INPUT field is a consumer-breaking change (Dir A)", () => {
  const report = analyze({
    oldDir: fx("variance/old"),
    newDir: fx("variance/new-input"),
    config: { entry: "index.d.ts", gateDirection: "consumer" },
  });
  assert.equal(report.verdict.gate, "fail");
  const breaking = report.findings.filter(f => f.severity === "breaking");
  assert.ok(breaking.length > 0, "expected a breaking finding");
  assert.ok(
    breaking.every(f => f.direction === "consumer"),
    "breaking findings must be consumer-direction"
  );
  assert.ok(
    breaking.some(f => f.symbol === "Client"),
    `expected Client to be localized, got: ${breaking.map(f => f.symbol).join(", ")}`
  );
});

test("added required OUTPUT field is NOT consumer-breaking, only forward info (Dir B)", () => {
  const report = analyze({
    oldDir: fx("variance/old"),
    newDir: fx("variance/new-output"),
    config: { entry: "index.d.ts", gateDirection: "consumer" },
  });
  assert.equal(
    report.verdict.gate,
    "pass",
    "adding an output field must not fail the consumer gate"
  );
  assert.equal(
    report.findings.filter(f => f.severity === "breaking").length,
    0,
    "no consumer-breaking findings expected"
  );
  assert.ok(
    report.findings.some(f => f.direction === "forward"),
    "expected a forward-compat (info) finding for the new output field"
  );
});

test("private/protected member changes produce no false positives", () => {
  const report = analyze({
    oldDir: fx("private-members/old"),
    newDir: fx("private-members/new"),
    config: { entry: "index.d.ts", gateDirection: "both" },
  });
  assert.deepEqual(
    report.findings,
    [],
    `expected zero findings, got: ${JSON.stringify(report.findings, null, 2)}`
  );
});

test("dropping a method overload is a consumer-breaking change", () => {
  const report = analyze({
    oldDir: fx("overload/old"),
    newDir: fx("overload/drop"),
    config: { entry: "index.d.ts", gateDirection: "consumer" },
  });
  assert.equal(report.verdict.gate, "fail");
  assert.ok(
    report.findings.some(f => f.severity === "breaking" && f.symbol === "C")
  );
});

test("identical overload set yields zero findings", () => {
  const report = analyze({
    oldDir: fx("overload/old"),
    newDir: fx("overload/same"),
    config: { entry: "index.d.ts", gateDirection: "both" },
  });
  assert.deepEqual(report.findings, []);
});

test("byte-identical trees yield zero findings", () => {
  const report = analyze({
    oldDir: fx("identical/old"),
    newDir: fx("identical/new"),
    config: { entry: "index.d.ts", gateDirection: "both" },
  });
  assert.deepEqual(
    report.findings,
    [],
    `expected zero findings, got: ${JSON.stringify(report.findings, null, 2)}`
  );
  assert.equal(report.verdict.gate, "pass");
});
