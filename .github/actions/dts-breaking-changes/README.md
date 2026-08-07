# dts-breaking-changes action

Composite action that runs the [`@elevenlabs/dts-breaking-changes`](../../../packages/dts-breaking-changes)
engine against one or more packages' built `.d.ts`, posts a single sticky PR
comment (a section per package), and fails the check when an unacknowledged
consumer-breaking change is found.

It builds nothing — the calling workflow prepares the base and head `.d.ts` trees
(e.g. build head, then build the merge-base in a `git worktree`) and passes their
directories in. This decoupling keeps the base-branch build setup in the consumer
repo, not duplicated here.

## Requirements

- **Node** on `PATH` (>= 22.18 or >= 24, for `--experimental-strip-types`) — the
  calling workflow's `setup-node` step. The action pulls in no external actions;
  it uses only `node`, `npm`, `gh`, `jq`, and `bash`.
- `github-token` with `pull-requests: write` to post the comment.

## Inputs

Choose one mode: **workspace** (`base-root` — discovers packages and entrypoints),
**explicit** (`surfaces`), or **single-surface** (the `*-dir` fields).

| Input                     | Default               | Description                                                                                                                                                              |
| ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `base-root`               | —                     | Workspace mode: root of the built base tree. Discovers each package's public type entrypoints (honoring `exports`/`types`/implicit siblings). Overrides the other modes. |
| `head-root`               | `.`                   | Workspace mode: root of the built head tree.                                                                                                                             |
| `allow-breaking-packages` | —                     | Workspace mode: comma-separated package names whose breaks are pre-acknowledged (e.g. major changesets).                                                                 |
| `surfaces`                | —                     | Explicit mode: JSON array `[{ title, oldDir, newDir, entry?, config?, allowBreaking? }]`.                                                                                |
| `old-dir`                 | —                     | Single-surface: base (previously-published) built `.d.ts` dir.                                                                                                           |
| `new-dir`                 | —                     | Single-surface: head (PR) built `.d.ts` dir.                                                                                                                             |
| `entry`                   | —                     | Single-surface: entry `.d.ts` relative to each dir. Optional if set in `config`.                                                                                         |
| `config`                  | —                     | Single-surface: path to a JSON config file ([`AnalyzeConfig`](../../../packages/dts-breaking-changes/README.md#config)).                                                 |
| `allow-breaking`          | `false`               | Single-surface: `true` to allow breaking changes without the label.                                                                                                      |
| `base-sha`                | —                     | Base SHA (shared by all surfaces), shown in the comment for traceability.                                                                                                |
| `label`                   | `breaking`            | PR label that acknowledges breaking changes (all surfaces) and downgrades the gate to a warning.                                                                         |
| `title`                   | `Type surface`        | Single-surface heading and the sticky-comment key.                                                                                                                       |
| `github-token`            | `${{ github.token }}` | Token used to post the comment.                                                                                                                                          |

In workspace mode, each package's public entrypoints are discovered via the TS
compiler's own module resolution — including implicit sibling `.d.ts`, every
`exports` subpath (e.g. `@scope/pkg/internal`), and every export **condition**
that resolves to a distinct type surface (e.g. a `react-native` condition
pointing at different types than `default`). A package can drop subpaths with
`ignoreEntrypoints` in its `dts-breaking-changes.json`. The comment groups results
by package, with a subsection per entrypoint (subpath, and condition when it
isn't the default).

## Outputs

| Output | Description             |
| ------ | ----------------------- |
| `gate` | Overall: `pass`/`fail`. |

## Behaviour

- Each surface's result appears under a `## <title>` heading in one comment. An
  unacknowledged consumer-breaking change in any surface fails the step.
- A break is acknowledged (downgraded to a warning) by the `label` on the PR
  (all surfaces) or a surface's own `allowBreaking` (e.g. a major changeset).
  Trigger the workflow on `labeled`/`unlabeled` so toggling the label clears or
  raises the check.
- The comment is **sticky**, keyed by `title`, so re-runs update it in place.

## Example (single package)

```yaml
- uses: actions/setup-node@v6
  with:
    node-version: lts/Krypton # or whatever the consumer repo pins
- uses: elevenlabs/packages/.github/actions/dts-breaking-changes@main
  with:
    old-dir: base-dist
    new-dir: dist
    entry: index.d.ts
    base-sha: ${{ steps.mergebase.outputs.sha }}
    title: "@elevenlabs/elevenlabs-js"
```

## Example (workspace)

```yaml
# After building head and the merge-base (into $RUNNER_TEMP/base):
- uses: ./.github/actions/dts-breaking-changes
  with:
    base-root: ${{ runner.temp }}/base
    head-root: ${{ github.workspace }}
    allow-breaking-packages: ${{ steps.changeset.outputs.majors }}
    base-sha: ${{ steps.base.outputs.sha }}
    title: packages
```
