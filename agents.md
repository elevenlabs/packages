# Agent instructions

## Running package tests with Vitest

Run Vitest for individual packages from the package that owns the tests.

```sh
cd packages/client
pnpm exec vitest --browser.headless
```

You can also run a single package from the repo root with a workspace filter:

```sh
pnpm --filter @elevenlabs/client exec vitest --browser.headless
pnpm --filter @elevenlabs/react exec vitest --browser.headless
pnpm --filter @elevenlabs/convai-widget-core exec vitest --browser.headless
```

To run a single test file, pass the file path after `run`:

```sh
cd packages/react
pnpm exec vitest --browser.headless src/conversation/ConversationClientTools.test.tsx
```

Always pass `--browser.headless` to avoid launching a visible browser window.

## Changesets

When changing a published package in a way that should trigger a release, add a
Changeset in `.changeset/` before committing. Include every affected package and
the appropriate bump type (`patch`, `minor`, or `major`) with a concise summary
that can be used in the changelog.

Use `pnpm run changeset` when interactive prompts are practical. Otherwise,
write the Changeset file directly using the standard frontmatter format:

```md
---
"@elevenlabs/client": patch
---

Describe the user-visible package change.
```
