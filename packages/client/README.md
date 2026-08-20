![hero](../../assets/hero.png)

# ElevenAgents TypeScript SDK

Build multimodal agents with [ElevenAgents](https://elevenlabs.io/docs/eleven-agents/overview).

A TypeScript / JavaScript client library for using ElevenAgents, or as a base for framework-specific libraries. If you're using React, consider using [`@elevenlabs/react`](https://www.npmjs.com/package/@elevenlabs/react) instead.

![LOGO](https://github.com/elevenlabs/elevenlabs-python/assets/12028621/21267d89-5e82-4e7e-9c81-caf30b237683)
[![Discord](https://badgen.net/badge/black/ElevenLabs/icon?icon=discord&label)](https://discord.gg/elevenlabs)
[![Twitter](https://badgen.net/badge/black/ElevenLabs/icon?icon=twitter&label)](https://twitter.com/ElevenLabs)

## Installation

```shell
npm install @elevenlabs/client
```

## Quick Start

```js
import { Conversation } from "@elevenlabs/client";

const conversation = await Conversation.startSession({
  agentId: "agent_7101k5zvyjhmfg983brhmhkd98n6", // replace with your agent's ID
  onConnect: ({ conversationId }) => {
    console.log("Connected:", conversationId);
  },
  onDisconnect: () => {
    console.log("Disconnected");
  },
  onMessage: message => {
    console.log("Message:", message);
  },
  onAgentResponseCorrection: ({
    original_agent_response,
    corrected_agent_response,
  }) => {
    console.log(
      "Agent response corrected:",
      original_agent_response,
      "->",
      corrected_agent_response
    );
  },
  onError: message => {
    console.error("Error:", message);
  },
});

// End the conversation
await conversation.endSession();
```

## Documentation

For the full API reference including connection types, client tools, conversation overrides, and more, see the [JavaScript SDK documentation](https://elevenlabs.io/docs/eleven-agents/libraries/java-script).

## Entrypoints

| Path                                | Stability                      |
| ----------------------------------- | ------------------------------ |
| `@elevenlabs/client`                | Public, semver-stable          |
| `@elevenlabs/client/internal`       | Internal, no semver guarantees |
| `@elevenlabs/client/internal/unity` | Internal, no semver guarantees |
| `@elevenlabs/client/worklets/*`     | Public, semver-stable          |

## Self-hosting AudioWorklets under a strict CSP

By default, `Conversation` and `Scribe` load their `AudioWorklet` processors
from `blob:`/`data:` URLs generated at runtime. `AudioWorklet.addModule()`
requests are governed by the `script-src-elem` directive (falling back to
`script-src`), so a strict CSP that only allows `script-src 'self'` will
reject those URLs.

To support strict CSPs, the raw processor sources are published as static
assets under `@elevenlabs/client/worklets/*`. Copy the ones you need into
your own static assets (e.g. via a build step or bundler copy plugin) and
serve them same-origin, then point the SDK at them:

```js
import { Conversation } from "@elevenlabs/client";

const conversation = await Conversation.startSession({
  agentId: "agent_...",
  workletPaths: {
    rawAudioProcessor: "/vendor/elevenlabs/raw-audio-processor.js",
    audioConcatProcessor: "/vendor/elevenlabs/audio-concat-processor.js",
  },
});
```

```js
import { Scribe } from "@elevenlabs/client";

const connection = Scribe.connect({
  token: "...",
  modelId: "scribe_v2_realtime",
  microphone: {
    workletPaths: {
      scribeAudioProcessor: "/vendor/elevenlabs/scribe-audio-processor.js",
    },
  },
});
```

## Approving MCP tool calls

When an agent's MCP tool requires approval, the server sends an
`mcp_tool_call` event in the `awaiting_approval` state and waits for a
decision. Pass `onMCPToolApprovalRequest` to decide, and the SDK puts the
result on the wire for you:

```js
import { Conversation } from "@elevenlabs/client";

const conversation = await Conversation.startSession({
  agentId: "agent_...",
  onMCPToolApprovalRequest: async toolCall =>
    window.confirm(
      `Allow ${toolCall.tool_name} from ${toolCall.service_id}?\n\n` +
        JSON.stringify(toolCall.parameters, null, 2)
    ),
});
```

The handler resolves to `true` to allow the call and `false` to deny it.
Rejecting, or resolving to anything that is not a boolean, is reported
through `onError` and treated as a denial, so a broken handler can never let
a tool call through.

Each `tool_call_id` is answered at most once. If the server moves a call out
of `awaiting_approval` before the handler resolves — its approval window
elapsed, for example — or the session ends, the late decision is dropped
rather than sent, and `onError` reports it. The handler's second argument
carries an `AbortSignal` for that case, so approval UI can dismiss itself
instead of waiting on a decision that no longer matters:

```js
const conversation = await Conversation.startSession({
  agentId: "agent_...",
  onMCPToolApprovalRequest: (toolCall, { signal }) =>
    new Promise(resolve => {
      const dialog = showApprovalDialog(toolCall, resolve);
      signal.addEventListener("abort", () => dialog.close());
    }),
});
```

`onMCPToolCall` still fires for every state, including `awaiting_approval`,
so existing observability code is unaffected. Handling approvals yourself
with `onMCPToolCall` plus `conversation.sendMCPToolApprovalResult()` also
keeps working — the handler is opt-in.

## Development

Please refer to the README.md file in the root of this repository.

## Contributing

Please create an issue first to discuss the proposed changes. Any contributions are welcome!

Remember, if merged, your code will be used as part of a MIT licensed project. By submitting a Pull Request, you are giving your consent for your code to be integrated into this library.
