# dts-breaking-changes action

Composite action that runs the [`@elevenlabs/dts-breaking-changes`](../../../packages/dts-breaking-changes)
engine against two directories of built `.d.ts`, posts a sticky PR comment, and
fails the check when a consumer-breaking change is found.

It builds nothing — the calling workflow prepares the base and head `.d.ts`
trees (e.g. build head, then build the merge-base in a `git worktree`) and passes
their directories in. This decoupling keeps the base-branch build setup in the
consumer repo, not duplicated here.

## Requirements

- **Node** on `PATH` (>= 22.18 or >= 24, for `--experimental-strip-types`) — the
  calling workflow's `setup-node` step. The action pulls in no external actions;
  it uses only `node`, `npm`, `gh`, `jq`, and `bash`.
- `github-token` with `pull-requests: write` to post the comment.

## Inputs

| Input          | Required | Default               | Description                                                                                              |
| -------------- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `old-dir`      | yes      | —                     | Base (previously-published) built `.d.ts` dir.                                                           |
| `new-dir`      | yes      | —                     | Head (PR) built `.d.ts` dir.                                                                             |
| `entry`        | no       | —                     | Entry `.d.ts` relative to each dir. Optional if set in `config`.                                         |
| `config`       | no       | —                     | Path to a JSON config file ([`AnalyzeConfig`](../../../packages/dts-breaking-changes/README.md#config)). |
| `base-sha`     | no       | —                     | Base SHA, shown in the comment for traceability.                                                         |
| `label`        | no       | `breaking`            | PR label that acknowledges breaking changes (downgrades the gate to a warning).                          |
| `title`        | no       | `Type surface`        | Human title; also keys the sticky comment so matrix packages stay distinct.                              |
| `github-token` | no       | `${{ github.token }}` | Token used to post the comment.                                                                          |

## Outputs

| Output           | Description                                                              |
| ---------------- | ------------------------------------------------------------------------ |
| `gate`           | Effective gate after the label escape hatch: `pass` \| `warn` \| `fail`. |
| `breaking-count` | Number of consumer-breaking findings.                                    |

## Behaviour

- A consumer-breaking finding fails the step (a red check), unless the PR carries
  the `label` — then it is reported as a warning and the step passes. Trigger the
  workflow on `labeled`/`unlabeled` so toggling the label clears or raises the
  check.
- The comment is **sticky**: it is keyed by `title`, so re-runs update the same
  comment instead of stacking, and a matrix over several packages posts one
  comment each.

## Example

```yaml
# In a consumer repo, after building head into dist/ and the merge-base into base-dist/:
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
