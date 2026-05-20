# Agent instructions

## Running package tests with Vitest

Run Vitest in headless mode for individual packages by using `vitest run` from the package that owns the tests.

```sh
cd packages/client
pnpm exec vitest run
```

You can also run a single package from the repo root with a workspace filter:

```sh
pnpm --filter @elevenlabs/client exec vitest run
pnpm --filter @elevenlabs/react exec vitest run
pnpm --filter @elevenlabs/convai-widget-core exec vitest run
```

To run a single test file headlessly, pass the file path after `run`:

```sh
cd packages/react
pnpm exec vitest run src/conversation/ConversationClientTools.test.tsx
```

Prefer `vitest run` over the package `test` script when working as an agent so Vitest does not enter watch mode.
