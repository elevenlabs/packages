#!/usr/bin/env node
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { parseArgs } from "node:util";

import { analyze } from "./analyze.ts";
import type { AnalyzeConfig } from "./config.ts";

function readConfig(configPath: string | undefined): Partial<AnalyzeConfig> {
  if (!configPath) return {};
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

const USAGE =
  "Usage: dts-breaking-changes --old <dir> --new <dir> [--entry <path>] [--config <file>]\n";

function main(): number {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        old: { type: "string" },
        new: { type: "string" },
        entry: { type: "string" },
        config: { type: "string" },
        "base-sha": { type: "string" },
        json: { type: "string" },
        markdown: { type: "string" },
      },
    }));
  } catch (err) {
    assert(err instanceof Error);
    process.stderr.write(`${err.message}\n${USAGE}`);
    return 2;
  }

  if (!values.old || !values.new) {
    process.stderr.write(USAGE);
    return 2;
  }

  const fileConfig = readConfig(values.config);
  const entry = values.entry ?? fileConfig.entry;
  if (!entry) {
    process.stderr.write(
      "Missing entry: pass --entry or set `entry` in the config file.\n"
    );
    return 2;
  }

  const report = analyze({
    oldDir: values.old,
    newDir: values.new,
    baseSha: values["base-sha"],
    config: { ...fileConfig, entry },
  });

  if (values.markdown) fs.writeFileSync(values.markdown, report.markdown);
  else process.stdout.write(`${report.markdown}\n`);
  if (values.json)
    fs.writeFileSync(values.json, JSON.stringify(report, null, 2));

  return report.verdict.gate === "fail" ? 1 : 0;
}

process.exitCode = main();
