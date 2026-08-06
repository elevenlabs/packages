#!/usr/bin/env node
import assert from "node:assert/strict";
import * as fs from "node:fs";
import { parseArgs } from "node:util";

import { z } from "zod";

import { analyze } from "./analyze.ts";
import { configFileSchema, type AnalyzeConfig } from "./config.ts";
import {
  renderCombined,
  sectionFails,
  type CombinedSection,
} from "./report.ts";

function readConfig(configPath: string | undefined): Partial<AnalyzeConfig> {
  if (!configPath) return {};
  return configFileSchema.parse(
    JSON.parse(fs.readFileSync(configPath, "utf8"))
  );
}

const USAGE =
  "Usage:\n" +
  "  dts-breaking-changes --old <dir> --new <dir> [--entry <path>] [--config <file>]\n" +
  "  dts-breaking-changes --surfaces <file> [--base-sha <sha>] [--label-acknowledged] [--markdown <file>]\n";

const surfacesSchema = z.array(
  z.object({
    title: z.string(),
    oldDir: z.string(),
    newDir: z.string(),
    entry: z.string().optional(),
    config: z.string().optional(),
    /** A per-surface override (e.g. a major changeset) that acknowledges a break. */
    allowBreaking: z.boolean().optional(),
  })
);

/**
 * Surfaces mode: analyze several packages and render one combined report. A
 * breaking result is acknowledged (downgraded to a warning) by `--label-
 * acknowledged` (a PR label, applies to all) or the surface's own
 * `allowBreaking`. Fails if any surface has an unacknowledged breaking change.
 */
function runSurfaces(
  surfacesPath: string,
  opts: { baseSha?: string; labelAcknowledged: boolean; markdownPath?: string }
): number {
  const surfaces = surfacesSchema.parse(
    JSON.parse(fs.readFileSync(surfacesPath, "utf8"))
  );

  const sections: CombinedSection[] = surfaces.map(s => {
    const fileConfig = readConfig(s.config);
    const entry = s.entry || fileConfig.entry;
    if (!entry) throw new Error(`Surface "${s.title}" is missing an entry.`);
    const report = analyze({
      oldDir: s.oldDir,
      newDir: s.newDir,
      baseSha: opts.baseSha,
      config: { ...fileConfig, entry },
    });
    const acknowledged = opts.labelAcknowledged || s.allowBreaking === true;
    const ackReason = opts.labelAcknowledged
      ? "the label"
      : s.allowBreaking
        ? "a major changeset"
        : undefined;
    return { title: s.title, acknowledged, ackReason, report };
  });

  const markdown = renderCombined(sections, opts.baseSha);
  if (opts.markdownPath) fs.writeFileSync(opts.markdownPath, markdown);
  else process.stdout.write(`${markdown}\n`);

  return sections.some(sectionFails) ? 1 : 0;
}

interface CliValues {
  old?: string;
  new?: string;
  entry?: string;
  config?: string;
  "base-sha"?: string;
  json?: string;
  markdown?: string;
}

function runSingle(values: CliValues): number {
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
        surfaces: { type: "string" },
        "label-acknowledged": { type: "boolean" },
      },
    }));
  } catch (err) {
    assert(err instanceof Error);
    process.stderr.write(`${err.message}\n${USAGE}`);
    return 2;
  }

  return values.surfaces
    ? runSurfaces(values.surfaces, {
        baseSha: values["base-sha"],
        labelAcknowledged: values["label-acknowledged"] ?? false,
        markdownPath: values.markdown,
      })
    : runSingle(values);
}

process.exitCode = main();
