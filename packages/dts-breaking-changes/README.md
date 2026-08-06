# @elevenlabs/dts-breaking-changes

Variance-aware breaking-change detection for TypeScript packages. Given two
directories of already-built `.d.ts` (a base and a head), it reports whether the
head introduces a change that would break existing consumers.

It is **pure analysis**: it never builds anything. Feeding it two built trees is
the caller's job (a CI workflow, a `git worktree`, downloaded artifacts). That
decoupling is what lets the same engine serve repos with very different builds.

## Why not a text diff of `.d.ts`?

Whether a change is breaking depends on **variance**, which a text diff can't see:

- Adding a required field to an **input** (options bag) type is breaking —
  existing callers don't supply it.
- Adding a required field to an **output** (return) type is **not** breaking —
  consumers just receive extra data.

The engine models each package's public surface as a single module type and asks
the TypeScript compiler for **structural assignability**. Parameters are
contravariant and returns covariant, so the compiler classifies input vs output
correctly for free.

Two directions are checked:

| Direction            | Assignability | Meaning                                                                                                                         |
| -------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **consumer** (Dir A) | `New` → `Old` | Existing callers. A failure is **breaking**: removed export, narrowed output, added required **input** field, dropped overload. |
| **forward** (Dir B)  | `Old` → `New` | Implementors. A failure is **info**: new export, new required **output** field.                                                 |

By default only the **consumer** direction gates the check; forward findings are
reported as notes.

## Usage

### CLI

```bash
node src/cli.ts \
  --old <base-dts-dir> \
  --new <head-dts-dir> \
  --entry index.d.ts \
  [--config config.json] \
  [--base-sha <sha>] \
  [--markdown report.md] \
  [--json report.json]
```

Exit code is `1` when the gate fails, `0` otherwise.

### Library

```ts
import { analyze } from "@elevenlabs/dts-breaking-changes";

const report = analyze({
  oldDir: "base/dist",
  newDir: "head/dist",
  config: { entry: "index.d.ts" },
});

report.verdict.gate; // "pass" | "fail" | "warn"
report.findings; // structured findings
report.markdown; // sticky-comment body
```

## Config

| Key                      | Default    | Purpose                                                                        |
| ------------------------ | ---------- | ------------------------------------------------------------------------------ |
| `entry`                  | —          | Entry `.d.ts` relative to each dir (e.g. `index.d.ts`, `dist/src/index.d.ts`). |
| `gateDirection`          | `consumer` | Which direction(s) fail the gate: `consumer` \| `forward` \| `both`.           |
| `ignore`                 | `[]`       | Globs on the dotted symbol path to drop (e.g. `core.**` for Fern internals).   |
| `severityOverrides`      | `{}`       | Glob → `breaking` \| `warning` \| `info`.                                      |
| `failOn`                 | `breaking` | Gate fails at or above this severity.                                          |
| `transformDepth`         | `8`        | Recursion bound for the `MethodsToProperties` transform.                       |
| `localizeDepth`          | `1`        | Per-symbol localization depth.                                                 |
| `compareTypeOnlyExports` | `false`    | Also compare pure type-only exports (see below). Opt-in per package.           |

## How it works

`Old = typeof import(baseEntry)` and `New = typeof import(headEntry)` are routed
through a `MethodsToProperties` transform, then compared with plain assignment
statements inside a code-generated in-memory harness. A failed assignment is a
`TS2322` whose message chain carries the offending property path. The two trees
are kept nominally distinct via synthetic `tsconfig` `paths` aliases.

`MethodsToProperties` is load-bearing twice:

1. It reconstructs method signatures as function-property signatures, so tsc
   checks their parameters **contravariantly** instead of bivariantly (methods
   are bivariant, which would hide added-required-input breaks).
2. Being a homomorphic mapped type over `keyof T`, it only sees **public** keys —
   `private`/`protected` members drop out, avoiding false positives from TS's
   nominal treatment of private members across two separate builds.

Analysis runs in two passes: a whole-module fast gate (Pass 1), then per-symbol
localization (Pass 2) only when a direction is red.

## Type-only exports (opt-in)

`typeof import()` exposes only the _value_ namespace. Interfaces and type aliases
reached _through_ a value (as a parameter, return, or property type) are compared
structurally as part of the value surface — for class/function-based packages
(e.g. `elevenlabs-js`) that covers the whole public API.

But a package whose public surface is **purely type-only** (e.g. `@elevenlabs/types`
— ~150 interfaces, no values) would look empty to the value surface, and any
change to it would pass silently. Setting `compareTypeOnlyExports: true` adds a
second pass that compares every pure type-only export **by name in type space**
(`import type * as Old` → `Old.Name` vs `New.Name`).

It is opt-in and deliberately kept separate from the value-surface convention,
because a **bare type's variance is ambiguous** — a consumer may _implement_ it
(added required field breaks them) or _receive_ it (added field is safe), and
there is no signature to tell which. So type-only findings use a heuristic:

| Change                                  | Severity                                     |
| --------------------------------------- | -------------------------------------------- |
| Removed export, removed/narrowed member | `breaking` (fails the gate)                  |
| Added required member                   | `warning` (surfaced, does not fail the gate) |
| New export                              | `info`                                       |

## Known limitations

- **Overloads beyond three.** Method overloads are preserved up to three
  signatures; a function with four or more collapses to its last signature, which
  can miss the drop of a non-last overload.
- **Constructor overloads.** Construct-signature parameters are preserved
  positionally from a single signature; overloaded constructors flatten.

These are safe-by-omission (they under-report rather than false-positive) and are
candidates for the progressive-hardening phase.
