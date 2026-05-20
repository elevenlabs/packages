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
