import assert from "node:assert/strict";
import { test } from "node:test";

import {
  renderCombined,
  sectionFails,
  type CombinedSection,
} from "./report.ts";
import type { Report } from "./types.ts";

function report(overrides: Partial<Report> = {}): Report {
  return {
    findings: [],
    verdict: { gate: "pass", breakingCount: 0, warningCount: 0, infoCount: 0 },
    markdown: "",
    baseSha: "abc1234",
    ...overrides,
  };
}

const breaking = (symbol: string): Report =>
  report({
    findings: [
      {
        direction: "consumer",
        severity: "breaking",
        symbol,
        code: 2322,
        message: `Property 'x' is missing`,
      },
    ],
    verdict: { gate: "fail", breakingCount: 1, warningCount: 0, infoCount: 0 },
  });

function section(
  pkg: string,
  o: Partial<CombinedSection> = {}
): CombinedSection {
  return {
    package: pkg,
    subpath: ".",
    condition: "default",
    acknowledged: false,
    report: report(),
    ...o,
  };
}

test("packages with no changes roll into one line instead of a heading each", () => {
  const md = renderCombined(
    [section("@elevenlabs/client"), section("@elevenlabs/types")],
    "abc1234"
  );
  assert.doesNotMatch(md, /^## /m); // no per-package headings when nothing changed
  assert.match(
    md,
    /No type-surface changes in @elevenlabs\/client, @elevenlabs\/types\./
  );
  assert.match(md, /No type-surface changes across 2 package\(s\)/);
  assert.match(md, /Compared against base abc1234\./);
  assert.doesNotMatch(md, /`abc1234`/); // SHA stays un-backticked for auto-linking
});

test("multiple changed entrypoints group under one package with subsections; count is per package", () => {
  const md = renderCombined(
    [
      section("@elevenlabs/client", {
        subpath: ".",
        report: breaking("Foo"),
      }),
      section("@elevenlabs/client", {
        subpath: "./internal",
        report: breaking("Bar"),
      }),
      section("@elevenlabs/react-native", {
        subpath: ".",
        condition: "default",
        report: breaking("Baz"),
      }),
      section("@elevenlabs/react-native", {
        subpath: ".",
        condition: "react-native",
        report: breaking("Qux"),
      }),
    ],
    "abc1234"
  );
  // Two packages, four entrypoints.
  assert.match(md, /2 of 2 package\(s\)/);
  assert.equal(md.match(/^## /gm)?.length, 2); // one heading per package
  assert.match(md, /### `\.\/internal`/); // subpath subsection
  assert.match(md, /### `\.` \(react-native\)/); // condition labelled when non-default
});

test("a clean entrypoint of a changed package is noted, not rendered as a section", () => {
  const md = renderCombined(
    [
      section("@elevenlabs/client", {
        subpath: ".",
        report: breaking("Foo"),
      }),
      section("@elevenlabs/client", { subpath: "./internal" }), // clean
      section("@elevenlabs/types"), // wholly clean
    ],
    "abc1234"
  );
  assert.match(md, /## @elevenlabs\/client/);
  assert.equal(md.match(/^## /gm)?.length, 1); // only the changed package gets a heading
  assert.doesNotMatch(md, /### `\.`/); // single rendered entrypoint drops its subheading
  // The clean entrypoint and the clean package both appear in the considered line.
  assert.match(
    md,
    /No type-surface changes in @elevenlabs\/client \(`\.\/internal`\), @elevenlabs\/types\./
  );
});

test("an unacknowledged breaking section fails; an acknowledged one does not", () => {
  const sections = [
    section("a", { report: breaking("Foo") }),
    section("b", {
      acknowledged: true,
      ackReason: "a major changeset",
      report: breaking("Bar"),
    }),
    section("c"),
  ];
  assert.equal(sectionFails(sections[0]), true);
  assert.equal(sectionFails(sections[1]), false);
  assert.equal(sectionFails(sections[2]), false);

  const md = renderCombined(sections, "abc1234");
  assert.match(
    md,
    /1 of 3 package\(s\).*consumer-breaking.*\(1 acknowledged\)/
  );
  assert.match(md, /Acknowledged via a major changeset/);
});
