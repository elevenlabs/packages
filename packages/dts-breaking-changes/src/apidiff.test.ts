import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { analyze } from "./analyze.ts";

const FX = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../test/fixtures/api-summary"
);

function run(apiSummary: boolean) {
  return analyze({
    oldDir: path.join(FX, "old"),
    newDir: path.join(FX, "new"),
    config: { entry: "index.d.ts", gateDirection: "both", apiSummary },
  });
}

test("apiSummary is opt-in", () => {
  assert.equal(run(false).apiChanges, undefined);
});

test("apiSummary enumerates added/removed exports and member-level changes", () => {
  const changes = run(true).apiChanges ?? [];
  const find = (kind: string, path: string) =>
    changes.find(c => c.kind === kind && c.path === path);

  assert.ok(find("add", "compose"), "new export compose");
  assert.ok(find("remove", "legacy"), "removed export legacy");
  assert.ok(find("add", "Client.cancel"), "new method Client.cancel");

  const send = find("change", "Client.send");
  assert.ok(send, "changed method Client.send");
  assert.match(send!.signature ?? "", /traceId/); // new return shape
  assert.doesNotMatch(send!.from ?? "", /traceId/); // old return shape

  // `connect` is unchanged (it only *returns* the changed Client) — no noise.
  assert.equal(
    changes.some(c => c.path === "connect" || c.path.startsWith("connect.")),
    false
  );
});

test("the report renders the API changes as a diff block", () => {
  const md = run(true).markdown;
  assert.match(md, /```diff/);
  assert.match(md, /^\+ compose/m);
  assert.match(md, /^- legacy/m);
  assert.match(md, /^\+ Client\.cancel/m);
});
